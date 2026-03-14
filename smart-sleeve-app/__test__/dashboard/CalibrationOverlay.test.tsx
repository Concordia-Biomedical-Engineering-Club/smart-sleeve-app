import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Animated } from "react-native";
import CalibrationOverlay from "@/components/dashboard/CalibrationOverlay";
import deviceReducer, { DeviceState } from "@/store/deviceSlice";
import userReducer, { UserState } from "@/store/userSlice";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: "Heavy" },
  NotificationFeedbackType: { Success: "Success" },
}));

jest.mock("@/components/ui/AppModal", () => ({
  AppModal: ({ visible, children, footer, title, subtitle }: any) =>
    visible ? (
      <>
        {title}
        {subtitle}
        {children}
        {footer}
      </>
    ) : null,
}));

jest.mock("@/components/ui/icon-symbol", () => ({
  IconSymbol: () => null,
}));

describe("CalibrationOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Animated, "timing").mockReturnValue({
      start: (callback?: (result: { finished: boolean }) => void) => {
        callback?.({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function renderOverlay({
    isSignalWarmedUp = true,
    liveSample = [0.25, 0.25, 0.25, 0.25],
    visible = true,
  }: {
    isSignalWarmedUp?: boolean;
    liveSample?: number[];
    visible?: boolean;
  } = {}) {
    const preloadedDeviceState: DeviceState = {
      connection: { connected: true },
      scenario: "REST",
      calibrationScenarioOverride: null,
      isScanning: false,
      latestEMG: null,
      latestIMU: null,
      latestFeatures: null,
      latestCalibrationSample: null,
      emgBuffer: [],
      kneeAngleBuffer: [],
      workout: {
        phase: "IDLE",
        exerciseId: null,
        exerciseName: null,
        targetSide: null,
        startTime: null,
        currentRep: 0,
        totalReps: 0,
        phaseSecondsRemaining: 0,
        workDurationSec: 0,
        restDurationSec: 0,
      },
      isFilteringEnabled: true,
      isSignalWarmedUp,
      sessionStatus: "IDLE",
      sessionStartTime: null,
      recordingBuffer: [],
      recordingKneeAngles: [],
      transportDiagnostics: {
        requestedTransportMode: "mock",
        activeTransportMode: "mock",
        usingFallbackTransport: false,
        lastConnectionPhase: "disconnected",
        lastConnectionReason: null,
        reconnectAttemptCount: 0,
        lastEMGPacketTimestamp: null,
        lastIMUPacketTimestamp: null,
        emgPacketCount: 0,
        imuPacketCount: 0,
        emgChecksumErrorCount: 0,
        imuChecksumErrorCount: 0,
        emgDroppedPacketCount: 0,
        imuDroppedPacketCount: 0,
        emgNotificationErrorCount: 0,
        imuNotificationErrorCount: 0,
        emgStaleTimeoutMs: 5000,
        imuStaleTimeoutMs: 5000,
        discoveredCharacteristics: [],
      },
    };

    const preloadedUserState: UserState = {
      isLoggedIn: false,
      email: null,
      isAuthenticated: false,
      calibrationsBySide: {
        LEFT: {
          baseline: [0, 0, 0, 0],
          mvc: [1, 1, 1, 1],
          calibratedAt: null,
        },
        RIGHT: {
          baseline: [0, 0, 0, 0],
          mvc: [1, 1, 1, 1],
          calibratedAt: null,
        },
      },
      showNormalized: false,
      injuredSide: null,
      hasCompletedOnboarding: false,
      injuryDetails: null,
      therapyGoal: null,
      profileOwnerEmail: null,
      measurementSide: null,
      syncStatus: "idle",
      lastSyncedAt: null,
    };

    const store = configureStore({
      reducer: {
        device: deviceReducer,
        user: userReducer,
      },
      preloadedState: {
        device: preloadedDeviceState,
        user: preloadedUserState,
      },
    });

    const onComplete = jest.fn();
    const onDismiss = jest.fn();

    const screen = render(
      <Provider store={store}>
        <CalibrationOverlay
          visible={visible}
          liveSample={liveSample}
          onComplete={onComplete}
          onDismiss={onDismiss}
        />
      </Provider>,
    );

    return { screen, store, onComplete, onDismiss };
  }

  it("blocks calibration start until the signal processor is warmed up", () => {
    const { screen, store } = renderOverlay({ isSignalWarmedUp: false });

    fireEvent.press(screen.getByText("Preparing signal..."));

    expect(store.getState().device.calibrationScenarioOverride).toBeNull();
    expect(screen.queryByText("STEP 1 OF 2")).toBeNull();
  });

  it("switches the calibration scenario override from REST to FLEX during the flow", () => {
    const { screen, store } = renderOverlay();

    fireEvent.press(screen.getByText("Start Calibration"));
    expect(store.getState().device.calibrationScenarioOverride).toBe("REST");

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(store.getState().device.calibrationScenarioOverride).toBe("FLEX");
  });

  it("clears the calibration scenario override when the overlay is closed", () => {
    const { screen, store } = renderOverlay();

    fireEvent.press(screen.getByText("Start Calibration"));
    expect(store.getState().device.calibrationScenarioOverride).toBe("REST");

    screen.rerender(
      <Provider store={store}>
        <CalibrationOverlay
          visible={false}
          liveSample={[0.25, 0.25, 0.25, 0.25]}
          onComplete={jest.fn()}
          onDismiss={jest.fn()}
        />
      </Provider>,
    );

    expect(store.getState().device.calibrationScenarioOverride).toBeNull();
  });
});
