/**
 * RealSleeveConnector.ts
 * -----------------------------------------------------
 * Actual hardware communication over BLE using react-native-ble-plx.
 *
 * HARDWARE INTEGRATION (ESP32 / MyoWare 2.0 Wireless Shield):
 * - EMG: 8-channel muscle activity data via BLE notifications
 * - Angle Sensor: AS5048A magnetic encoder for knee flexion (0-140°)
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
} from "./ISleeveConnector";
import {
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

type BleDeviceLike = Pick<
  Device,
  | "id"
  | "name"
  | "discoverAllServicesAndCharacteristics"
  | "monitorCharacteristicForService"
  | "cancelConnection"
  | "onDisconnected"
>;

type BleManagerLike = Pick<
  BleManager,
  "startDeviceScan" | "stopDeviceScan" | "connectToDevice"
>;

const SCAN_TIMEOUT_MS = 5000;
const RECONNECT_DELAY_MS = 1500;
const MAX_RECONNECT_ATTEMPTS = 3;

export class RealSleeveConnector implements ISleeveConnector {
  private manager: BleManagerLike;
  private connectedDevice: BleDeviceLike | null = null;
  private emgSubscribers: ((frame: EMGData) => void)[] = [];
  private imuSubscribers: ((frame: IMUData) => void)[] = [];
  private connectionSubscribers: ((status: ConnectionStatus) => void)[] = [];
  private notificationSubscriptions: RemovableSubscription[] = [];
  private disconnectSubscription: RemovableSubscription | null = null;
  private scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
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
      return [];
    }

    this.stopScan();
    console.log("[RealSleeveConnector] Starting scan for:", SERVICE_UUID);
    const devicesFound: string[] = [];

    return new Promise((resolve) => {
      this.isScanning = true;
      this.manager.startDeviceScan(
        [SERVICE_UUID],
        null,
        (error: unknown, device: ScanResultDevice) => {
          if (error) {
            console.error("[RealSleeveConnector] Scan error:", error);
            this.stopScan();
            resolve(devicesFound);
            return;
          }

          if (device && device.name?.startsWith(DEVICE_NAME_PREFIX)) {
            console.log(
              "[RealSleeveConnector] Found device:",
              device.name,
              device.id,
            );
            if (!devicesFound.includes(device.id)) {
              devicesFound.push(device.id);
            }
          }
        },
      );

      this.scanTimeoutId = setTimeout(() => {
        this.stopScan();
        resolve(devicesFound);
      }, SCAN_TIMEOUT_MS);
    });
  }

  /**
   * Connect to an ESP32 device.
   */
  async connect(deviceId: string): Promise<void> {
    this.stopScan();
    this.clearReconnectTimer();
    this.lastDeviceId = deviceId;
    this.isManualDisconnect = false;

    try {
      console.log(`[RealSleeveConnector] Connecting to ${deviceId}...`);
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();

      this.teardownSubscriptions();
      this.connectedDevice = device;
      this.reconnectAttempts = 0;
      this.emitConnectionStatus(true);

      this.disconnectSubscription?.remove();
      this.disconnectSubscription = device.onDisconnected(
        (error: unknown, disconnectedDevice: DisconnectEventDevice) => {
          console.warn(
            `[RealSleeveConnector] Device ${disconnectedDevice?.id ?? deviceId} disconnected`,
            error,
          );
          this.teardownSubscriptions();
          this.connectedDevice = null;
          this.emitConnectionStatus(false);
          if (!this.isManualDisconnect) {
            this.scheduleReconnect(deviceId);
          }
        },
      );

      this.setupNotifications(device);
    } catch (err) {
      console.error("[RealSleeveConnector] Connection failed:", err);
      this.connectedDevice = null;
      this.emitConnectionStatus(false);
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
          return;
        }
        if (!char?.value) {
          return;
        }

        const parsedPacket = parseEMGPacketBase64(char.value);
        if (!parsedPacket) {
          console.warn("[RealSleeveConnector] Dropping invalid EMG packet");
          return;
        }
        if (!parsedPacket.checksumValid) {
          console.warn("[RealSleeveConnector] EMG checksum mismatch");
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
          return;
        }
        if (!char?.value) {
          return;
        }

        const parsedPacket = parseIMUPacketBase64(char.value);
        if (!parsedPacket) {
          console.warn("[RealSleeveConnector] Dropping invalid IMU packet");
          return;
        }
        if (!parsedPacket.checksumValid) {
          console.warn("[RealSleeveConnector] IMU checksum mismatch");
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

    this.emitConnectionStatus(false);
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

  setScenario(scenario: SleeveScenario): void {
    // Hardware doesn't care about scenario, it just streams reality.
    // This could optionally send a command to the ESP32 if firmware support it.
    console.log(
      "[RealSleeveConnector] setScenario called for real hardware:",
      scenario,
    );
  }

  private emitConnectionStatus(connected: boolean): void {
    const status: ConnectionStatus = {
      connected,
      deviceId: this.connectedDevice?.id,
      lastUpdated: Date.now(),
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
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn("[RealSleeveConnector] Reconnect attempts exhausted");
      return;
    }

    this.clearReconnectTimer();
    this.reconnectAttempts += 1;
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect(deviceId).catch((error) => {
        console.error("[RealSleeveConnector] Reconnect attempt failed:", error);
        if (!this.isManualDisconnect) {
          this.scheduleReconnect(deviceId);
        }
      });
    }, RECONNECT_DELAY_MS);
  }
}
