jest.mock(
  "react-native-ble-plx",
  () => ({
    BleManager: jest.fn(),
  }),
  { virtual: true },
);

import { RealSleeveConnector } from "@/services/SleeveConnector/RealSleeveConnector";
import {
  DEVICE_NAME_PREFIX,
  EMG_CHAR_UUID,
  IMU_CHAR_UUID,
  SERVICE_UUID,
} from "@/constants/ble";

type DisconnectCallback = (
  error?: Error | null,
  device?: { id: string },
) => void;

describe("RealSleeveConnector", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let disconnectCallback: DisconnectCallback | null;
  let emgMonitor: { remove: jest.Mock };
  let imuMonitor: { remove: jest.Mock };
  let mockDevice: {
    id: string;
    name: string;
    discoverAllServicesAndCharacteristics: jest.Mock;
    monitorCharacteristicForService: jest.Mock;
    cancelConnection: jest.Mock;
    onDisconnected: jest.Mock;
  };
  let manager: {
    startDeviceScan: jest.Mock;
    stopDeviceScan: jest.Mock;
    connectToDevice: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
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
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  it("scans with the sleeve service filter and returns matching device ids", async () => {
    const connector = new RealSleeveConnector(manager as any);

    const scanPromise = connector.scan();
    await Promise.resolve();
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
    expect(manager.stopDeviceScan).toHaveBeenCalled();
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
