jest.mock(
  "react-native-ble-plx",
  () => ({
    BleManager: jest.fn(),
  }),
  { virtual: true },
);

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, render, waitFor } from "@testing-library/react-native";
import userReducer from "@/store/userSlice";
import deviceReducer from "@/store/deviceSlice";
import { useSleeveDevice } from "@/hooks/useSleeveDevice";
import { RealSleeveConnector } from "@/services/SleeveConnector/RealSleeveConnector";
import {
  BLE_RECONNECT_DELAY_MS,
  DEVICE_NAME_PREFIX,
  EMG_CHAR_UUID,
  EMG_STALE_TIMEOUT_MS,
  IMU_CHAR_UUID,
} from "@/constants/ble";
import { ProgrammableBleManager } from "@/__test__/helpers/ProgrammableBleHarness";

const USE_MOCK_HARDWARE_ENV_KEY = [
  "EXPO",
  "PUBLIC",
  "USE",
  "MOCK",
  "HARDWARE",
].join("_");

function HookHarness({ connector }: { connector: RealSleeveConnector }) {
  useSleeveDevice(connector);
  return null;
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("useSleeveDevice integration harness", () => {
  const originalUseMockHardware = process.env[USE_MOCK_HARDWARE_ENV_KEY];

  beforeEach(() => {
    jest.useFakeTimers();
    process.env[USE_MOCK_HARDWARE_ENV_KEY] = "false";
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalUseMockHardware === undefined) {
      delete process.env[USE_MOCK_HARDWARE_ENV_KEY];
    } else {
      process.env[USE_MOCK_HARDWARE_ENV_KEY] = originalUseMockHardware;
    }
  });

  it("handles bursty, duplicate, and out-of-order frames without breaking feature extraction", async () => {
    const manager = new ProgrammableBleManager();
    const device = manager.registerDevice(
      "device-1",
      `${DEVICE_NAME_PREFIX}-01`,
    );
    const connector = new RealSleeveConnector(manager as never);
    const store = configureStore({
      reducer: {
        user: userReducer,
        device: deviceReducer,
      },
    });

    render(
      <Provider store={store}>
        <HookHarness connector={connector} />
      </Provider>,
    );

    await act(async () => {
      await connector.connect("device-1");
    });

    await act(async () => {
      [100, 120, 110, 110, 140, 160, 180, 200, 220, 240].forEach(
        (timestamp) => {
          device.emitEMGPacket({
            timestamp,
            channels: [1000, 900, 800, 700, 600, 500, 400, 300],
          });
        },
      );

      device.emitIMUPacket({ timestamp: 240, rawRoll: 1024 });
    });

    await waitFor(() => {
      expect(store.getState().device.latestFeatures).not.toBeNull();
    });

    const state = store.getState().device;
    expect(state.transportDiagnostics.activeTransportMode).toBe("real");
    expect(state.transportDiagnostics.emgPacketCount).toBe(10);
    expect(state.latestEMG?.timestamp).toBe(240);
    expect(state.latestIMU?.timestamp).toBe(240);
    expect(state.latestFeatures?.rms.length).toBeGreaterThan(0);
  });

  it("records corrupted packets, notification errors, and reconnect exhaustion through redux diagnostics", async () => {
    const manager = new ProgrammableBleManager();
    const device = manager.registerDevice(
      "device-1",
      `${DEVICE_NAME_PREFIX}-01`,
    );

    const connector = new RealSleeveConnector(manager as never);
    const store = configureStore({
      reducer: {
        user: userReducer,
        device: deviceReducer,
      },
    });

    render(
      <Provider store={store}>
        <HookHarness connector={connector} />
      </Provider>,
    );

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
      expect(
        store.getState().device.transportDiagnostics.emgDroppedPacketCount,
      ).toBe(1);
    });

    await waitFor(() => {
      expect(store.getState().device.connection.phase).toBe("failed");
    });

    const diagnostics = store.getState().device.transportDiagnostics;
    expect(diagnostics.imuChecksumErrorCount).toBe(1);
    expect(diagnostics.imuNotificationErrorCount).toBe(1);
    expect(diagnostics.reconnectAttemptCount).toBe(3);
    expect(store.getState().device.connection.phase).toBe("failed");
    expect(store.getState().device.connection.reason).toBe(
      "reconnect-exhausted",
    );
  });

  it("surfaces discovery-contract failures when required characteristics are missing", async () => {
    const manager = new ProgrammableBleManager();
    manager.registerDevice("device-1", `${DEVICE_NAME_PREFIX}-01`, {
      characteristicUuids: [EMG_CHAR_UUID],
    });

    const connector = new RealSleeveConnector(manager as never);
    const store = configureStore({
      reducer: {
        user: userReducer,
        device: deviceReducer,
      },
    });

    render(
      <Provider store={store}>
        <HookHarness connector={connector} />
      </Provider>,
    );

    await expect(connector.connect("device-1")).rejects.toThrow(
      "missing-characteristics",
    );

    await waitFor(() => {
      expect(store.getState().device.connection.phase).toBe("failed");
    });

    expect(store.getState().device.connection.reason).toBe(
      "missing-characteristics",
    );
    expect(
      store.getState().device.transportDiagnostics.discoveredCharacteristics,
    ).toEqual([EMG_CHAR_UUID]);
    expect(store.getState().device.transportDiagnostics.emgStaleTimeoutMs).toBe(
      EMG_STALE_TIMEOUT_MS,
    );
  });

  it("recovers from an unexpected disconnect when the next reconnect attempt succeeds", async () => {
    const manager = new ProgrammableBleManager();
    const device = manager.registerDevice(
      "device-1",
      `${DEVICE_NAME_PREFIX}-01`,
    );
    const connector = new RealSleeveConnector(manager as never);
    const store = configureStore({
      reducer: {
        user: userReducer,
        device: deviceReducer,
      },
    });

    render(
      <Provider store={store}>
        <HookHarness connector={connector} />
      </Provider>,
    );

    await act(async () => {
      await connector.connect("device-1");
      device.emitUnexpectedDisconnect();
      jest.advanceTimersByTime(BLE_RECONNECT_DELAY_MS);
      await flushAsyncWork();
    });

    await waitFor(() => {
      expect(store.getState().device.connection.phase).toBe("connected");
    });

    await act(async () => {
      device.emitEMGPacket({
        timestamp: 400,
        channels: [900, 800, 700, 600, 500, 400, 300, 200],
      });
      device.emitIMUPacket({ timestamp: 400, rawRoll: 1200 });
    });

    await waitFor(() => {
      expect(store.getState().device.latestEMG?.timestamp).toBe(400);
      expect(store.getState().device.latestIMU?.timestamp).toBe(400);
    });

    const state = store.getState().device;
    expect(state.connection.connected).toBe(true);
    expect(state.transportDiagnostics.reconnectAttemptCount).toBe(0);
    expect(state.latestEMG?.timestamp).toBe(400);
    expect(state.latestIMU?.timestamp).toBe(400);
  });
});
