jest.mock(
  "react-native-ble-plx",
  () => ({
    BleManager: jest.fn(),
  }),
  { virtual: true },
);

import React from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import TestBLEScreen from "@/app/(tabs)/test-ble";
import userReducer from "@/store/userSlice";
import deviceReducer from "@/store/deviceSlice";
import { useSleeveDevice } from "@/hooks/useSleeveDevice";
import { RealSleeveConnector } from "@/services/SleeveConnector/RealSleeveConnector";
import {
  BLE_RECONNECT_DELAY_MS,
  BLE_SCAN_TIMEOUT_MS,
  DEVICE_NAME_PREFIX,
  EMG_CHAR_UUID,
  EMG_STALE_TIMEOUT_MS,
  IMU_CHAR_UUID,
  IMU_STALE_TIMEOUT_MS,
} from "@/constants/ble";
import { ProgrammableBleManager } from "@/__test__/helpers/ProgrammableBleHarness";

const USE_MOCK_HARDWARE_ENV_KEY = [
  "EXPO",
  "PUBLIC",
  "USE",
  "MOCK",
  "HARDWARE",
].join("_");

let mockSleeveConnector: RealSleeveConnector;

jest.mock("@/hooks/useSleeve", () => ({
  useSleeve: () => mockSleeveConnector,
}));

jest.mock("react-native-chart-kit", () => ({
  LineChart: () => "LineChart",
}));

function HookHarness({ connector }: { connector: RealSleeveConnector }) {
  useSleeveDevice(connector);
  return null;
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("TestBLEScreen", () => {
  const originalUseMockHardware = process.env[USE_MOCK_HARDWARE_ENV_KEY];
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let originalPlatformOs: string;
  let originalPlatformVersion: string | number;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(10_000));
    jest.clearAllMocks();
    originalPlatformOs = Platform.OS;
    originalPlatformVersion = Platform.Version;
    process.env[USE_MOCK_HARDWARE_ENV_KEY] = "false";
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
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

    if (originalUseMockHardware === undefined) {
      delete process.env[USE_MOCK_HARDWARE_ENV_KEY];
    } else {
      process.env[USE_MOCK_HARDWARE_ENV_KEY] = originalUseMockHardware;
    }
  });

  function renderHarnessScreen(connector: RealSleeveConnector) {
    mockSleeveConnector = connector;

    const store = configureStore({
      reducer: {
        user: userReducer,
        device: deviceReducer,
      },
    });

    const screen = render(
      <Provider store={store}>
        <HookHarness connector={connector} />
        <TestBLEScreen />
      </Provider>,
    );

    return { screen, store };
  }

  it("renders stale diagnostics once packets age past the configured timeout", async () => {
    const manager = new ProgrammableBleManager();
    const device = manager.registerDevice(
      "device-1",
      `${DEVICE_NAME_PREFIX}-01`,
    );
    const connector = new RealSleeveConnector(manager as never);
    const { screen, store } = renderHarnessScreen(connector);
    const packetTimestamp = Date.now();

    await act(async () => {
      await connector.connect("device-1");
      device.emitEMGPacket({
        timestamp: packetTimestamp,
        channels: [1000, 900, 800, 700, 600, 500, 400, 300],
      });
      device.emitIMUPacket({ timestamp: packetTimestamp, rawRoll: 1024 });
    });

    await waitFor(() => {
      expect(screen.getByText(/Status:/)).toBeTruthy();
      expect(screen.getByText(/EMG packets: 1/)).toBeTruthy();
      expect(screen.getByText(/IMU packets: 1/)).toBeTruthy();
      expect(
        screen.getByText(
          new RegExp(`EMG stale: no \\(${EMG_STALE_TIMEOUT_MS} ms\\)`),
        ),
      ).toBeTruthy();
      expect(
        screen.getByText(
          new RegExp(`IMU stale: no \\(${IMU_STALE_TIMEOUT_MS} ms\\)`),
        ),
      ).toBeTruthy();
    });

    await act(async () => {
      jest.advanceTimersByTime(
        Math.max(EMG_STALE_TIMEOUT_MS, IMU_STALE_TIMEOUT_MS) + 1,
      );
    });

    screen.rerender(
      <Provider store={store}>
        <HookHarness connector={connector} />
        <TestBLEScreen />
      </Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          new RegExp(`EMG stale: yes \\(${EMG_STALE_TIMEOUT_MS} ms\\)`),
        ),
      ).toBeTruthy();
      expect(
        screen.getByText(
          new RegExp(`IMU stale: yes \\(${IMU_STALE_TIMEOUT_MS} ms\\)`),
        ),
      ).toBeTruthy();
    });
  });

  it("renders checksum, dropped-packet, notify-error, and reconnect failure diagnostics", async () => {
    const manager = new ProgrammableBleManager();
    const device = manager.registerDevice(
      "device-1",
      `${DEVICE_NAME_PREFIX}-01`,
    );
    const connector = new RealSleeveConnector(manager as never);
    const { screen } = renderHarnessScreen(connector);

    await act(async () => {
      await connector.connect("device-1");
    });

    manager.failNextConnections([
      new Error("retry-1"),
      new Error("retry-2"),
      new Error("retry-3"),
    ]);

    await act(async () => {
      device.emitCorruptedPacket(EMG_CHAR_UUID, [0x00, 0x01, 0x02]);
      device.emitIMUPacket({
        timestamp: 250,
        rawRoll: 1024,
        checksumValid: false,
      });
      device.emitNotificationError(IMU_CHAR_UUID, "imu notify failed");
      device.emitUnexpectedDisconnect();

      for (let attempt = 0; attempt < 3; attempt += 1) {
        jest.advanceTimersByTime(BLE_RECONNECT_DELAY_MS);
        await flushAsyncWork();
      }

      await flushAsyncWork();
    });

    await waitFor(() => {
      expect(screen.getByText(/EMG dropped packets: 1/)).toBeTruthy();
      expect(screen.getByText(/IMU checksum errors: 1/)).toBeTruthy();
      expect(screen.getByText(/IMU notify errors: 1/)).toBeTruthy();
      expect(screen.getByText(/Reconnect attempts: 3/)).toBeTruthy();
      expect(screen.getByText(/Phase: failed/)).toBeTruthy();
    });
  });

  it("renders the no-device scan state after a scan completes without sleeve advertisements", async () => {
    const manager = new ProgrammableBleManager();
    const connector = new RealSleeveConnector(manager as never);
    const { screen } = renderHarnessScreen(connector);

    fireEvent.press(screen.getByText("Scan for Devices"));

    await waitFor(() => {
      expect(screen.getByText("Scanning...")).toBeTruthy();
      expect(screen.getByText(/Phase: scanning/)).toBeTruthy();
    });

    await act(async () => {
      jest.advanceTimersByTime(BLE_SCAN_TIMEOUT_MS);
      await flushAsyncWork();
    });

    await waitFor(() => {
      expect(screen.getByText("Scan for Devices")).toBeTruthy();
      expect(screen.getByText(/Phase: disconnected/)).toBeTruthy();
      expect(screen.queryByText(/Connect to:/)).toBeNull();
    });
  });

  it("renders scan failure diagnostics when the BLE manager reports a scan error", async () => {
    const manager = new ProgrammableBleManager();
    const connector = new RealSleeveConnector(manager as never);
    const { screen } = renderHarnessScreen(connector);

    fireEvent.press(screen.getByText("Scan for Devices"));

    await waitFor(() => {
      expect(screen.getByText(/Phase: scanning/)).toBeTruthy();
    });

    await act(async () => {
      manager.emitScanError("scan failed");
      await flushAsyncWork();
    });

    await waitFor(() => {
      expect(screen.getByText(/Phase: failed/)).toBeTruthy();
    });
  });

  it("renders permission-denied diagnostics when Android BLE permissions are rejected", async () => {
    const manager = new ProgrammableBleManager();
    const connector = new RealSleeveConnector(manager as never);
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

    const { screen } = renderHarnessScreen(connector);

    fireEvent.press(screen.getByText("Scan for Devices"));

    await waitFor(() => {
      expect(screen.getByText(/Phase: failed/)).toBeTruthy();
      expect(screen.getByText("Scan for Devices")).toBeTruthy();
      expect(screen.queryByText(/Connect to:/)).toBeNull();
    });

    permissionsSpy.mockRestore();
  });
});
