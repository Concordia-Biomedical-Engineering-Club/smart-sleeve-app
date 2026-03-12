jest.mock(
  "react-native-ble-plx",
  () => ({
    BleManager: jest.fn(),
  }),
  { virtual: true },
);

import { PermissionsAndroid, Platform } from "react-native";
import { RealSleeveConnector } from "@/services/SleeveConnector/RealSleeveConnector";
import {
  BLE_SCAN_TIMEOUT_MS,
  DEVICE_NAME_PREFIX,
  EMG_CHAR_UUID,
  IMU_CHAR_UUID,
  SERVICE_UUID,
} from "@/constants/ble";

function withChecksum(bytes: number[]): string {
  let checksum = bytes[0] ?? 0;
  for (let index = 1; index < bytes.length - 1; index += 1) {
    checksum ^= bytes[index];
  }
  bytes[bytes.length - 1] = checksum;
  return Buffer.from(Uint8Array.from(bytes)).toString("base64");
}

type DisconnectCallback = (
  error?: Error | null,
  device?: { id: string },
) => void;

describe("RealSleeveConnector", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let originalPlatformOs: string;
  let originalPlatformVersion: string | number;
  let disconnectCallback: DisconnectCallback | null;
  let emgMonitor: { remove: jest.Mock };
  let imuMonitor: { remove: jest.Mock };
  let mockDevice: {
    id: string;
    name: string;
    discoverAllServicesAndCharacteristics: jest.Mock;
    services: jest.Mock;
    characteristicsForService: jest.Mock;
    monitorCharacteristicForService: jest.Mock;
    cancelConnection: jest.Mock;
    onDisconnected: jest.Mock;
  };
  let manager: {
    startDeviceScan: jest.Mock;
    stopDeviceScan: jest.Mock;
    connectToDevice: jest.Mock;
    state: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    originalPlatformOs = Platform.OS;
    originalPlatformVersion = Platform.Version;
    consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    disconnectCallback = null;
    emgMonitor = { remove: jest.fn() };
    imuMonitor = { remove: jest.fn() };
    mockDevice = {
      id: "device-1",
      name: `${DEVICE_NAME_PREFIX}-001`,
      discoverAllServicesAndCharacteristics: jest
        .fn()
        .mockResolvedValue(undefined),
      services: jest.fn().mockResolvedValue([{ uuid: SERVICE_UUID }]),
      characteristicsForService: jest
        .fn()
        .mockResolvedValue([{ uuid: EMG_CHAR_UUID }, { uuid: IMU_CHAR_UUID }]),
      monitorCharacteristicForService: jest
        .fn()
        .mockReturnValueOnce(emgMonitor)
        .mockReturnValueOnce(imuMonitor),
      cancelConnection: jest.fn().mockResolvedValue(undefined),
      onDisconnected: jest
        .fn()
        .mockImplementation((callback: DisconnectCallback) => {
          disconnectCallback = callback;
          return { remove: jest.fn() };
        }),
    };
    manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn().mockResolvedValue(mockDevice),
      state: jest.fn().mockResolvedValue("PoweredOn"),
    };
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs,
    });
    Object.defineProperty(Platform, "Version", {
      configurable: true,
      value: originalPlatformVersion,
    });
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  it("scans with the sleeve service filter and returns matching device ids", async () => {
    const connector = new RealSleeveConnector(manager as any);

    const scanPromise = connector.scan();
    while (manager.startDeviceScan.mock.calls.length === 0) {
      await Promise.resolve();
    }
    const scanCallback = manager.startDeviceScan.mock.calls[0][2];
    scanCallback(null, { id: "device-1", name: `${DEVICE_NAME_PREFIX}-001` });
    scanCallback(null, { id: "device-2", name: "OTHER-DEVICE" });
    jest.runAllTimers();

    await expect(scanPromise).resolves.toEqual(["device-1"]);
    expect(manager.startDeviceScan).toHaveBeenCalledWith(
      [SERVICE_UUID],
      null,
      expect.any(Function),
    );
    expect(manager.state).toHaveBeenCalled();
    expect(manager.stopDeviceScan).toHaveBeenCalled();
  });

  it("resolves an empty scan when no matching devices are found before timeout", async () => {
    const connector = new RealSleeveConnector(manager as any);

    const scanPromise = connector.scan();
    while (manager.startDeviceScan.mock.calls.length === 0) {
      await Promise.resolve();
    }

    jest.advanceTimersByTime(BLE_SCAN_TIMEOUT_MS);

    await expect(scanPromise).resolves.toEqual([]);
    expect(manager.stopDeviceScan).toHaveBeenCalled();
  });

  it("emits a failed scan state when the BLE manager reports a scan error", async () => {
    const connector = new RealSleeveConnector(manager as any);
    const statuses: Array<{
      connected: boolean;
      phase?: string;
      reason?: string;
    }> = [];

    connector.onConnectionStatusChange((status) => {
      statuses.push({
        connected: status.connected,
        phase: status.phase,
        reason: status.reason,
      });
    });

    const scanPromise = connector.scan();
    while (manager.startDeviceScan.mock.calls.length === 0) {
      await Promise.resolve();
    }

    const scanCallback = manager.startDeviceScan.mock.calls[0][2];
    scanCallback(new Error("scan failed"), null);

    await expect(scanPromise).resolves.toEqual([]);
    expect(statuses).toEqual([
      {
        connected: false,
        phase: "scanning",
        reason: undefined,
      },
      {
        connected: false,
        phase: "failed",
        reason: "scan-error",
      },
    ]);
  });

  it("does not start scanning when the BLE adapter is unavailable", async () => {
    const connector = new RealSleeveConnector(manager as any);
    const statuses: Array<{
      connected: boolean;
      phase?: string;
      reason?: string;
    }> = [];
    manager.state.mockResolvedValue("PoweredOff");

    connector.onConnectionStatusChange((status) => {
      statuses.push({
        connected: status.connected,
        phase: status.phase,
        reason: status.reason,
      });
    });

    await expect(connector.scan()).resolves.toEqual([]);

    expect(manager.startDeviceScan).not.toHaveBeenCalled();
    expect(statuses).toEqual([
      {
        connected: false,
        phase: "failed",
        reason: "adapter-unavailable",
      },
    ]);
  });

  it("does not start scanning when Android BLE permissions are denied", async () => {
    const connector = new RealSleeveConnector(manager as any);
    const statuses: Array<{
      connected: boolean;
      phase?: string;
      reason?: string;
    }> = [];
    const permissionsSpy = jest
      .spyOn(PermissionsAndroid, "requestMultiple")
      .mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]:
          PermissionsAndroid.RESULTS.DENIED,
        [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]:
          PermissionsAndroid.RESULTS.GRANTED,
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
          PermissionsAndroid.RESULTS.GRANTED,
      });

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    Object.defineProperty(Platform, "Version", {
      configurable: true,
      value: 33,
    });

    connector.onConnectionStatusChange((status) => {
      statuses.push({
        connected: status.connected,
        phase: status.phase,
        reason: status.reason,
      });
    });

    await expect(connector.scan()).resolves.toEqual([]);

    expect(permissionsSpy).toHaveBeenCalled();
    expect(manager.state).not.toHaveBeenCalled();
    expect(manager.startDeviceScan).not.toHaveBeenCalled();
    expect(statuses).toEqual([
      {
        connected: false,
        phase: "failed",
        reason: "permissions-denied",
      },
    ]);

    permissionsSpy.mockRestore();
  });

  it("connects, discovers characteristics, and subscribes to EMG and IMU notifications", async () => {
    const connector = new RealSleeveConnector(manager as any);
    const statuses: Array<{
      connected: boolean;
      phase?: string;
      discoveredCharacteristics?: string[];
    }> = [];
    connector.onConnectionStatusChange((status) => {
      statuses.push({
        connected: status.connected,
        phase: status.phase,
        discoveredCharacteristics: status.discoveredCharacteristics,
      });
    });

    await connector.connect("device-1");

    expect(manager.connectToDevice).toHaveBeenCalledWith("device-1");
    expect(mockDevice.discoverAllServicesAndCharacteristics).toHaveBeenCalled();
    expect(mockDevice.services).toHaveBeenCalled();
    expect(mockDevice.characteristicsForService).toHaveBeenCalledWith(
      SERVICE_UUID,
    );
    expect(mockDevice.monitorCharacteristicForService).toHaveBeenNthCalledWith(
      1,
      SERVICE_UUID,
      EMG_CHAR_UUID,
      expect.any(Function),
    );
    expect(mockDevice.monitorCharacteristicForService).toHaveBeenNthCalledWith(
      2,
      SERVICE_UUID,
      IMU_CHAR_UUID,
      expect.any(Function),
    );
    expect(statuses).toEqual([
      {
        connected: false,
        phase: "connecting",
        discoveredCharacteristics: undefined,
      },
      {
        connected: true,
        phase: "connected",
        discoveredCharacteristics: [EMG_CHAR_UUID, IMU_CHAR_UUID],
      },
    ]);
  });

  it("fails connection when the expected sleeve service is missing after discovery", async () => {
    const connector = new RealSleeveConnector(manager as any);
    const statuses: Array<{
      connected: boolean;
      phase?: string;
      reason?: string;
    }> = [];
    mockDevice.services.mockResolvedValue([]);

    connector.onConnectionStatusChange((status) => {
      statuses.push({
        connected: status.connected,
        phase: status.phase,
        reason: status.reason,
      });
    });

    await expect(connector.connect("device-1")).rejects.toThrow(
      "missing-service",
    );

    expect(mockDevice.monitorCharacteristicForService).not.toHaveBeenCalled();
    expect(statuses).toEqual([
      {
        connected: false,
        phase: "connecting",
      },
      {
        connected: false,
        phase: "failed",
        reason: "missing-service",
      },
    ]);
  });

  it("fails connection when discovered characteristics do not match the sleeve contract", async () => {
    const connector = new RealSleeveConnector(manager as any);
    const statuses: Array<{
      connected: boolean;
      phase?: string;
      reason?: string;
      discoveredCharacteristics?: string[];
    }> = [];
    mockDevice.characteristicsForService.mockResolvedValue([
      { uuid: EMG_CHAR_UUID },
    ]);

    connector.onConnectionStatusChange((status) => {
      statuses.push({
        connected: status.connected,
        phase: status.phase,
        reason: status.reason,
        discoveredCharacteristics: status.discoveredCharacteristics,
      });
    });

    await expect(connector.connect("device-1")).rejects.toThrow(
      "missing-characteristics",
    );

    expect(mockDevice.monitorCharacteristicForService).not.toHaveBeenCalled();
    expect(statuses).toEqual([
      {
        connected: false,
        phase: "connecting",
        discoveredCharacteristics: undefined,
      },
      {
        connected: false,
        phase: "failed",
        reason: "missing-characteristics",
        discoveredCharacteristics: [EMG_CHAR_UUID],
      },
    ]);
  });

  it("emits transport events for invalid packets and checksum mismatches", async () => {
    const connector = new RealSleeveConnector(manager as any);
    const events: Array<{ stream: string; kind: string }> = [];

    connector.onTransportEvent((event) => {
      events.push({ stream: event.stream, kind: event.kind });
    });

    await connector.connect("device-1");

    const emgCallback =
      mockDevice.monitorCharacteristicForService.mock.calls[0][2];
    const imuCallback =
      mockDevice.monitorCharacteristicForService.mock.calls[1][2];

    emgCallback(null, { value: Buffer.from([0x00, 0x01]).toString("base64") });

    const imuPacket = new Array(12).fill(0);
    imuPacket[0] = 0xb1;
    imuPacket[11] = 0xff;
    imuCallback(null, {
      value: Buffer.from(Uint8Array.from(imuPacket)).toString("base64"),
    });

    expect(events).toEqual([
      { stream: "emg", kind: "invalid-packet" },
      { stream: "imu", kind: "checksum-mismatch" },
    ]);
  });

  it("emits transport events for notification callback errors", async () => {
    const connector = new RealSleeveConnector(manager as any);
    const events: Array<{ stream: string; kind: string }> = [];

    connector.onTransportEvent((event) => {
      events.push({ stream: event.stream, kind: event.kind });
    });

    await connector.connect("device-1");

    const emgCallback =
      mockDevice.monitorCharacteristicForService.mock.calls[0][2];
    emgCallback(new Error("notify failed"), null);

    expect(events).toEqual([{ stream: "emg", kind: "notification-error" }]);
  });

  it("removes active notification subscriptions on disconnect", async () => {
    const connector = new RealSleeveConnector(manager as any);

    await connector.connect("device-1");
    await connector.disconnect();

    expect(emgMonitor.remove).toHaveBeenCalled();
    expect(imuMonitor.remove).toHaveBeenCalled();
    expect(mockDevice.cancelConnection).toHaveBeenCalled();
  });

  it("attempts automatic reconnect after unexpected disconnect", async () => {
    const connector = new RealSleeveConnector(manager as any);

    await connector.connect("device-1");
    disconnectCallback?.(new Error("link lost"), { id: "device-1" });
    jest.advanceTimersByTime(1500);
    await Promise.resolve();
    await Promise.resolve();

    expect(manager.connectToDevice).toHaveBeenCalledTimes(2);
    expect(manager.connectToDevice).toHaveBeenLastCalledWith("device-1");
  });

  it("does not reconnect after manual disconnect", async () => {
    const connector = new RealSleeveConnector(manager as any);

    await connector.connect("device-1");
    await connector.disconnect();

    disconnectCallback?.(new Error("user ended session"), { id: "device-1" });
    jest.advanceTimersByTime(1500);

    expect(manager.connectToDevice).toHaveBeenCalledTimes(1);
  });

  it("stops an active scan when connect begins", async () => {
    const connector = new RealSleeveConnector(manager as any);

    const scanPromise = connector.scan();
    await Promise.resolve();

    await connector.connect("device-1");
    jest.runAllTimers();
    await scanPromise;

    expect(manager.stopDeviceScan).toHaveBeenCalled();
  });
});
