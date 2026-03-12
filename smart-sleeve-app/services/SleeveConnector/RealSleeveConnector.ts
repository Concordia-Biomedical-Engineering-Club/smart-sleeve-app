/**
 * RealSleeveConnector.ts
 * -----------------------------------------------------
 * Actual hardware communication over BLE using react-native-ble-plx.
 *
 * HARDWARE INTEGRATION (ESP32 / MyoWare 2.0 Wireless Shield):
 * - EMG: 8-channel muscle activity data via BLE notifications
 * - Angle Sensor: magnetic encoder for knee flexion (0-140°)
 *
 * BLE Characteristics:
 * - SERVICE_UUID: e0d10001-6b6e-4c52-9c3b-6a8e858c5d93
 * - EMG_CHAR_UUID: e0d10002-6b6e-4c52-9c3b-6a8e858c5d93 (Notify)
 * - IMU_CHAR_UUID: e0d10003-6b6e-4c52-9c3b-6a8e858c5d93 (Notify)
 * -----------------------------------------------------
 */

import { BleManager, Device } from "react-native-ble-plx";
import { Platform, PermissionsAndroid } from "react-native";
import {
  ISleeveConnector,
  EMGData,
  IMUData,
  ConnectionStatus,
  SleeveScenario,
  TransportEvent,
  TransportEventKind,
  TransportStream,
} from "./ISleeveConnector";
import {
  BLE_MAX_RECONNECT_ATTEMPTS,
  BLE_RECONNECT_DELAY_MS,
  BLE_SCAN_TIMEOUT_MS,
  SERVICE_UUID,
  EMG_CHAR_UUID,
  IMU_CHAR_UUID,
  DEVICE_NAME_PREFIX,
} from "@/constants/ble";
import { parseEMGPacketBase64, parseIMUPacketBase64 } from "./packetParsers";

type RemovableSubscription = {
  remove: () => void;
};

type ScanResultDevice = {
  id: string;
  name?: string | null;
} | null;

type DisconnectEventDevice = {
  id: string;
} | null;

type Base64Characteristic = {
  value?: string | null;
} | null;

type BleServiceLike = {
  uuid: string;
};

type BleCharacteristicLike = {
  uuid: string;
};

type DiscoveryValidationFailureReason =
  | "adapter-unavailable"
  | "missing-service"
  | "missing-characteristics";

class DiscoveryValidationError extends Error {
  constructor(
    readonly reason: DiscoveryValidationFailureReason,
    readonly discoveredCharacteristics?: string[],
  ) {
    super(reason);
  }
}

type BleDeviceLike = Pick<
  Device,
  | "id"
  | "name"
  | "discoverAllServicesAndCharacteristics"
  | "services"
  | "characteristicsForService"
  | "monitorCharacteristicForService"
  | "cancelConnection"
  | "onDisconnected"
>;

type BleManagerLike = Pick<
  BleManager,
  "startDeviceScan" | "stopDeviceScan" | "connectToDevice" | "state"
>;

const REQUIRED_CHARACTERISTIC_UUIDS = [EMG_CHAR_UUID, IMU_CHAR_UUID];

export class RealSleeveConnector implements ISleeveConnector {
  private manager: BleManagerLike;
  private connectedDevice: BleDeviceLike | null = null;
  private emgSubscribers: ((frame: EMGData) => void)[] = [];
  private imuSubscribers: ((frame: IMUData) => void)[] = [];
  private connectionSubscribers: ((status: ConnectionStatus) => void)[] = [];
  private transportEventSubscribers: ((event: TransportEvent) => void)[] = [];
  private notificationSubscriptions: RemovableSubscription[] = [];
  private disconnectSubscription: RemovableSubscription | null = null;
  private scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private scanResolve: ((deviceIds: string[]) => void) | null = null;
  private scanResults: string[] = [];
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastDeviceId: string | null = null;
  private reconnectAttempts = 0;
  private isScanning = false;
  private isManualDisconnect = false;

  constructor(manager?: BleManagerLike) {
    this.manager = manager ?? new BleManager();
  }

  /**
   * Request Bluetooth permissions for Android.
   */
  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return true;

    // Android 12 (API 31) and above requires specific BT permissions
    if (Platform.Version >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }

    // Android 10/11 (API 23-30) legacy Bluetooth scanning via Location
    if (Platform.Version >= 23) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }

  /**
   * Scan for real BLE devices advertising our SERVICE_UUID.
   */
  async scan(): Promise<string[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn("[RealSleeveConnector] Bluetooth permissions denied.");
      this.emitConnectionStatus(false, {
        phase: "failed",
        reason: "permissions-denied",
      });
      return [];
    }

    const adapterReady = await this.ensureAdapterReady();
    if (!adapterReady) {
      return [];
    }

    this.stopScan();
    this.scanResults = [];
    console.log("[RealSleeveConnector] Starting scan for:", SERVICE_UUID);
    this.emitConnectionStatus(false, { phase: "scanning" });

    return new Promise((resolve) => {
      this.scanResolve = resolve;
      this.isScanning = true;
      this.manager.startDeviceScan(
        [SERVICE_UUID],
        null,
        (error: unknown, device: ScanResultDevice) => {
          if (error) {
            console.error("[RealSleeveConnector] Scan error:", error);
            this.stopScan();
            this.emitConnectionStatus(false, {
              phase: "failed",
              reason: "scan-error",
            });
            this.resolveScan(this.scanResults);
            return;
          }

          if (device && device.name?.startsWith(DEVICE_NAME_PREFIX)) {
            console.log(
              "[RealSleeveConnector] Found device:",
              device.name,
              device.id,
            );
            if (!this.scanResults.includes(device.id)) {
              this.scanResults.push(device.id);
            }
          }
        },
      );

      this.scanTimeoutId = setTimeout(() => {
        this.stopScan();
        this.emitConnectionStatus(false, { phase: "disconnected" });
        this.resolveScan(this.scanResults);
      }, BLE_SCAN_TIMEOUT_MS);
    });
  }

  /**
   * Connect to an ESP32 device.
   */
  async connect(deviceId: string): Promise<void> {
    const adapterReady = await this.ensureAdapterReady();
    if (!adapterReady) {
      throw new DiscoveryValidationError("adapter-unavailable");
    }

    this.stopScan();
    this.clearReconnectTimer();
    this.lastDeviceId = deviceId;
    this.isManualDisconnect = false;
    const reconnectAttempt = this.reconnectAttempts;

    this.emitConnectionStatus(false, {
      phase: reconnectAttempt > 0 ? "reconnecting" : "connecting",
      reconnectAttempt,
    });

    try {
      console.log(`[RealSleeveConnector] Connecting to ${deviceId}...`);
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      const discoveredCharacteristics =
        await this.validateDiscoveredCharacteristics(device);

      this.teardownSubscriptions();
      this.connectedDevice = device;
      this.reconnectAttempts = 0;

      this.disconnectSubscription?.remove();
      this.disconnectSubscription = device.onDisconnected(
        (error: unknown, disconnectedDevice: DisconnectEventDevice) => {
          console.warn(
            `[RealSleeveConnector] Device ${disconnectedDevice?.id ?? deviceId} disconnected`,
            error,
          );
          this.teardownSubscriptions();
          this.connectedDevice = null;
          this.emitConnectionStatus(false, {
            phase: "disconnected",
            reason: this.isManualDisconnect
              ? "manual-disconnect"
              : "unexpected-disconnect",
            reconnectAttempt: this.reconnectAttempts,
          });
          if (!this.isManualDisconnect) {
            this.scheduleReconnect(deviceId);
          }
        },
      );

      this.setupNotifications(device);
      this.emitConnectionStatus(true, {
        phase: "connected",
        reconnectAttempt: this.reconnectAttempts,
        discoveredCharacteristics,
      });
    } catch (err) {
      console.error("[RealSleeveConnector] Connection failed:", err);
      this.connectedDevice = null;
      this.emitConnectionStatus(false, {
        phase: "failed",
        reconnectAttempt,
        reason:
          err instanceof DiscoveryValidationError
            ? err.reason
            : "connect-failed",
        discoveredCharacteristics:
          err instanceof DiscoveryValidationError
            ? err.discoveredCharacteristics
            : undefined,
      });
      throw err;
    }
  }

  /**
   * Setup BLE Notify listeners for EMG and IMU traits.
   */
  private setupNotifications(device: BleDeviceLike) {
    const emgSubscription = device.monitorCharacteristicForService(
      SERVICE_UUID,
      EMG_CHAR_UUID,
      (error: unknown, char: Base64Characteristic) => {
        if (error) {
          console.error("[RealSleeveConnector] EMG notification error:", error);
          this.emitTransportEvent("emg", "notification-error", error);
          return;
        }
        if (!char?.value) {
          return;
        }

        const parsedPacket = parseEMGPacketBase64(char.value);
        if (!parsedPacket) {
          console.warn("[RealSleeveConnector] Dropping invalid EMG packet");
          this.emitTransportEvent("emg", "invalid-packet");
          return;
        }
        if (!parsedPacket.checksumValid) {
          console.warn("[RealSleeveConnector] EMG checksum mismatch");
          this.emitTransportEvent("emg", "checksum-mismatch");
        }
        this.emgSubscribers.forEach((callback) => callback(parsedPacket.frame));
      },
    );

    const imuSubscription = device.monitorCharacteristicForService(
      SERVICE_UUID,
      IMU_CHAR_UUID,
      (error: unknown, char: Base64Characteristic) => {
        if (error) {
          console.error("[RealSleeveConnector] IMU notification error:", error);
          this.emitTransportEvent("imu", "notification-error", error);
          return;
        }
        if (!char?.value) {
          return;
        }

        const parsedPacket = parseIMUPacketBase64(char.value);
        if (!parsedPacket) {
          console.warn("[RealSleeveConnector] Dropping invalid IMU packet");
          this.emitTransportEvent("imu", "invalid-packet");
          return;
        }
        if (!parsedPacket.checksumValid) {
          console.warn("[RealSleeveConnector] IMU checksum mismatch");
          this.emitTransportEvent("imu", "checksum-mismatch");
        }
        this.imuSubscribers.forEach((callback) => callback(parsedPacket.frame));
      },
    );

    this.notificationSubscriptions.push(emgSubscription, imuSubscription);
  }

  async disconnect(): Promise<void> {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.stopScan();
    this.teardownSubscriptions();

    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
    }

    this.emitConnectionStatus(false, {
      phase: "disconnected",
      reason: "manual-disconnect",
    });
  }

  subscribeToEMG(callback: (data: EMGData) => void): () => void {
    this.emgSubscribers.push(callback);
    return () => {
      this.emgSubscribers = this.emgSubscribers.filter((cb) => cb !== callback);
    };
  }

  subscribeToIMU(callback: (data: IMUData) => void): () => void {
    this.imuSubscribers.push(callback);
    return () => {
      this.imuSubscribers = this.imuSubscribers.filter((cb) => cb !== callback);
    };
  }

  onConnectionStatusChange(
    callback: (status: ConnectionStatus) => void,
  ): () => void {
    this.connectionSubscribers.push(callback);
    return () => {
      this.connectionSubscribers = this.connectionSubscribers.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onTransportEvent(callback: (event: TransportEvent) => void): () => void {
    this.transportEventSubscribers.push(callback);
    return () => {
      this.transportEventSubscribers = this.transportEventSubscribers.filter(
        (subscriber) => subscriber !== callback,
      );
    };
  }

  setScenario(scenario: SleeveScenario): void {
    // Hardware doesn't care about scenario, it just streams reality.
    // This could optionally send a command to the ESP32 if firmware support it.
    console.log(
      "[RealSleeveConnector] setScenario called for real hardware:",
      scenario,
    );
  }

  private emitConnectionStatus(
    connected: boolean,
    overrides: Partial<ConnectionStatus> = {},
  ): void {
    const status: ConnectionStatus = {
      connected,
      deviceId: this.connectedDevice?.id,
      lastUpdated: Date.now(),
      phase: connected ? "connected" : "disconnected",
      ...overrides,
    };
    this.connectionSubscribers.forEach((callback) => callback(status));
  }

  private stopScan(): void {
    if (!this.isScanning) {
      return;
    }
    this.manager.stopDeviceScan();
    this.isScanning = false;
    if (this.scanTimeoutId) {
      clearTimeout(this.scanTimeoutId);
      this.scanTimeoutId = null;
    }
    this.resolveScan(this.scanResults);
  }

  private resolveScan(deviceIds: string[]): void {
    this.scanResolve?.(deviceIds);
    this.scanResolve = null;
    this.scanResults = [];
  }

  private emitTransportEvent(
    stream: TransportStream,
    kind: TransportEventKind,
    error?: unknown,
  ): void {
    const event: TransportEvent = {
      stream,
      kind,
      timestamp: Date.now(),
      detail: error instanceof Error ? error.message : undefined,
    };

    this.transportEventSubscribers.forEach((callback) => callback(event));
  }

  private async ensureAdapterReady(): Promise<boolean> {
    const state = await this.manager.state();
    if (state === "PoweredOn") {
      return true;
    }

    console.warn(`[RealSleeveConnector] BLE adapter not ready: ${state}`);
    this.emitConnectionStatus(false, {
      phase: "failed",
      reason: "adapter-unavailable",
    });
    return false;
  }

  private async validateDiscoveredCharacteristics(
    device: BleDeviceLike,
  ): Promise<string[]> {
    const services = await device.services();
    const hasExpectedService = services.some(
      (service: BleServiceLike) => service.uuid === SERVICE_UUID,
    );

    if (!hasExpectedService) {
      throw new DiscoveryValidationError("missing-service");
    }

    const characteristics =
      await device.characteristicsForService(SERVICE_UUID);
    const discoveredCharacteristics = characteristics.map(
      (characteristic: BleCharacteristicLike) => characteristic.uuid,
    );
    const missingCharacteristics = REQUIRED_CHARACTERISTIC_UUIDS.filter(
      (uuid) => !discoveredCharacteristics.includes(uuid),
    );

    if (missingCharacteristics.length > 0) {
      throw new DiscoveryValidationError(
        "missing-characteristics",
        discoveredCharacteristics,
      );
    }

    return discoveredCharacteristics;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  private teardownSubscriptions(): void {
    this.notificationSubscriptions.forEach((subscription) => {
      subscription.remove();
    });
    this.notificationSubscriptions = [];

    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
  }

  private scheduleReconnect(deviceId: string): void {
    if (this.reconnectAttempts >= BLE_MAX_RECONNECT_ATTEMPTS) {
      console.warn("[RealSleeveConnector] Reconnect attempts exhausted");
      this.emitConnectionStatus(false, {
        phase: "failed",
        reconnectAttempt: this.reconnectAttempts,
        reason: "reconnect-exhausted",
      });
      return;
    }

    this.clearReconnectTimer();
    this.reconnectAttempts += 1;
    this.emitConnectionStatus(false, {
      phase: "reconnecting",
      reconnectAttempt: this.reconnectAttempts,
    });
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect(deviceId).catch((error) => {
        console.error("[RealSleeveConnector] Reconnect attempt failed:", error);
        if (!this.isManualDisconnect) {
          this.scheduleReconnect(deviceId);
        }
      });
    }, BLE_RECONNECT_DELAY_MS);
  }
}
