import deviceReducer, {
  calibrationSampleReceived,
  connectionChanged,
  emgFrameReceived,
  imuFrameReceived,
  clearBuffers,
  selectEmgBufferLength,
  selectTransportDiagnostics,
  setCalibrationScenarioOverride,
  signalWarmupChanged,
  transportEventRecorded,
  transportDiagnosticsChanged,
  DeviceState,
  startWorkout,
} from "@/store/deviceSlice";
import { EMGData, IMUData } from "@/services/SleeveConnector/ISleeveConnector";

describe("deviceSlice", () => {
  const initialState: DeviceState = {
    connection: { connected: false },
    scenario: "REST",
    isScanning: false,
    latestEMG: null,
    latestIMU: null,
    latestFeatures: null,
    latestCalibrationSample: null,
    emgBuffer: [],
    kneeAngleBuffer: [],
    calibrationScenarioOverride: null,
    isSignalWarmedUp: false,
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
      emgStaleTimeoutMs: 1000,
      imuStaleTimeoutMs: 1000,
      discoveredCharacteristics: [],
    },
  };

  test("should handle initial state", () => {
    expect(deviceReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  test("should append EMG data to buffer and maintain 500 max length", () => {
    let state: DeviceState = initialState;
    const mockEMG: EMGData = {
      header: 0xaa,
      timestamp: Date.now(),
      channels: [100, 200, 300, 400],
      checksum: 0,
    };

    for (let i = 0; i < 505; i++) {
      state = deviceReducer(
        state,
        emgFrameReceived({ ...mockEMG, timestamp: i }),
      );
    }

    expect(state.emgBuffer.length).toBe(500);
    expect(state.latestEMG?.timestamp).toBe(504);
    expect(state.emgBuffer[0].timestamp).toBe(5);
    expect(state.transportDiagnostics.lastEMGPacketTimestamp).toBe(504);
    expect(state.transportDiagnostics.emgPacketCount).toBe(505);
  });

  test("should append IMU roll to kneeAngleBuffer and maintain 500 max length", () => {
    let state: DeviceState = initialState;
    const mockIMU: IMUData = {
      header: 0xbb,
      timestamp: Date.now(),
      roll: 45,
      pitch: 0,
      yaw: 0,
      checksum: 0,
    };

    for (let i = 0; i < 505; i++) {
      state = deviceReducer(state, imuFrameReceived({ ...mockIMU, roll: i }));
    }

    expect(state.kneeAngleBuffer.length).toBe(500);
    expect(state.latestIMU?.roll).toBe(504);
    expect(state.kneeAngleBuffer[0]).toBe(5);
    expect(state.transportDiagnostics.lastIMUPacketTimestamp).toBe(
      mockIMU.timestamp,
    );
    expect(state.transportDiagnostics.imuPacketCount).toBe(505);
  });

  test("should clear buffers", () => {
    let state: DeviceState = {
      ...initialState,
      emgBuffer: [{ header: 0, timestamp: 0, channels: [1, 2], checksum: 0 }],
      kneeAngleBuffer: [10, 20],
    };

    state = deviceReducer(state, clearBuffers());
    expect(state.emgBuffer).toEqual([]);
    expect(state.kneeAngleBuffer).toEqual([]);
  });

  test("selectEmgBufferLength should return correct length", () => {
    const state = {
      device: {
        ...initialState,
        emgBuffer: new Array(10).fill({
          header: 0,
          timestamp: 0,
          channels: [],
          checksum: 0,
        }),
      },
    };
    // @ts-ignore - partial state for testing, RootState matches this structure
    expect(selectEmgBufferLength(state)).toBe(10);
  });

  test("should handle featuresUpdated", () => {
    const mockFeatures = { rms: [0.1, 0.2], mav: [0.05, 0.1] };
    const action = { type: "device/featuresUpdated", payload: mockFeatures };
    const state = deviceReducer(initialState, action);
    expect(state.latestFeatures).toEqual(mockFeatures);
  });

  test("should handle startWorkout", () => {
    const mockWorkout = {
      exerciseId: "quad-sets",
      exerciseName: "Quadriceps Sets",
      targetSide: "LEFT" as const,
      totalReps: 10,
      workDurationSec: 5,
      restDurationSec: 3,
    };
    const state = deviceReducer(initialState, startWorkout(mockWorkout));
    expect(state.workout.exerciseId).toBe(mockWorkout.exerciseId);
    expect(state.workout.phase).toBe("COUNTDOWN");
    expect(state.workout.workDurationSec).toBe(5);
    expect(state.sessionStatus).toBe("RECORDING");
    expect(state.recordingKneeAngles).toEqual([]);
  });

  test("should record full IMU frames while a session is recording", () => {
    const recordingState = deviceReducer(
      initialState,
      startWorkout({
        exerciseId: "quad-sets",
        exerciseName: "Quadriceps Sets",
        targetSide: "LEFT",
        totalReps: 10,
        workDurationSec: 5,
        restDurationSec: 3,
      }),
    );

    const imuFrame: IMUData = {
      header: 0xbb,
      timestamp: 1234,
      roll: 42,
      pitch: 0,
      yaw: 0,
      checksum: 0,
    };

    const nextState = deviceReducer(recordingState, imuFrameReceived(imuFrame));
    expect(nextState.recordingKneeAngles).toEqual([imuFrame]);
  });

  test("should handle cancelWorkout", () => {
    const stateWithWorkout: DeviceState = {
      ...initialState,
      workout: {
        ...initialState.workout,
        phase: "ACTIVE_WORK",
        exerciseId: "quad-sets",
      },
    };
    const action = { type: "device/cancelWorkout" };
    const state = deviceReducer(stateWithWorkout, action);
    expect(state.workout.phase).toBe("IDLE");
    expect(state.workout.exerciseId).toBeNull();
  });

  test("should handle completeWorkout", () => {
    const stateWithWorkout: DeviceState = {
      ...initialState,
      workout: {
        ...initialState.workout,
        phase: "COMPLETING",
        exerciseId: "quad-sets",
      },
    };
    const action = { type: "device/completeWorkout" };
    const state = deviceReducer(stateWithWorkout, action);
    expect(state.workout.phase).toBe("IDLE");
    expect(state.workout.exerciseId).toBeNull();
  });

  test("should handle setFilteringEnabled", () => {
    const action = { type: "device/setFilteringEnabled", payload: false };
    const state = deviceReducer(initialState, action);
    expect(state.isFilteringEnabled).toBe(false);
  });

  test("should store calibration scenario override and latest calibration sample", () => {
    let state = deviceReducer(
      initialState,
      setCalibrationScenarioOverride("REST"),
    );
    state = deviceReducer(
      state,
      calibrationSampleReceived([0.1, -0.1, 0.2, -0.2]),
    );

    expect(state.calibrationScenarioOverride).toBe("REST");
    expect(state.latestCalibrationSample).toEqual([0.1, -0.1, 0.2, -0.2]);
  });

  test("should track signal warmup state", () => {
    const state = deviceReducer(initialState, signalWarmupChanged(true));
    expect(state.isSignalWarmedUp).toBe(true);
  });

  test("should clear calibration runtime state when disconnected", () => {
    const connectedState: DeviceState = {
      ...initialState,
      connection: { connected: true },
      latestCalibrationSample: [0.2, 0.3, 0.4, 0.5],
      calibrationScenarioOverride: "FLEX",
      isSignalWarmedUp: true,
    };

    const state = deviceReducer(
      connectedState,
      connectionChanged({ connected: false }),
    );

    expect(state.latestCalibrationSample).toBeNull();
    expect(state.calibrationScenarioOverride).toBeNull();
    expect(state.isSignalWarmedUp).toBe(false);
  });

  test("should track transport mode and fallback state", () => {
    const state = deviceReducer(
      initialState,
      transportDiagnosticsChanged({
        requestedTransportMode: "real",
        activeTransportMode: "mock",
        usingFallbackTransport: true,
      }),
    );

    expect(state.transportDiagnostics.requestedTransportMode).toBe("real");
    expect(state.transportDiagnostics.activeTransportMode).toBe("mock");
    expect(state.transportDiagnostics.usingFallbackTransport).toBe(true);
  });

  test("should track connection phase, reconnect attempts, and discovered characteristics", () => {
    const state = deviceReducer(
      initialState,
      connectionChanged({
        connected: true,
        phase: "connected",
        reconnectAttempt: 2,
        discoveredCharacteristics: ["emg-char", "imu-char"],
        reason: "ready",
      }),
    );

    expect(state.transportDiagnostics.lastConnectionPhase).toBe("connected");
    expect(state.transportDiagnostics.reconnectAttemptCount).toBe(2);
    expect(state.transportDiagnostics.discoveredCharacteristics).toEqual([
      "emg-char",
      "imu-char",
    ]);
    expect(state.transportDiagnostics.lastConnectionReason).toBe("ready");
  });

  test("should track checksum, dropped-packet, and notification transport events", () => {
    let state = deviceReducer(
      initialState,
      transportEventRecorded({
        stream: "emg",
        kind: "checksum-mismatch",
        timestamp: 100,
      }),
    );

    state = deviceReducer(
      state,
      transportEventRecorded({
        stream: "imu",
        kind: "invalid-packet",
        timestamp: 101,
      }),
    );

    state = deviceReducer(
      state,
      transportEventRecorded({
        stream: "imu",
        kind: "notification-error",
        timestamp: 102,
        detail: "notify failed",
      }),
    );

    expect(state.transportDiagnostics.emgChecksumErrorCount).toBe(1);
    expect(state.transportDiagnostics.imuDroppedPacketCount).toBe(1);
    expect(state.transportDiagnostics.imuNotificationErrorCount).toBe(1);
  });

  test("selectTransportDiagnostics should return diagnostics state", () => {
    const state = {
      device: initialState,
    };
    // @ts-ignore - partial state for testing
    expect(selectTransportDiagnostics(state)).toEqual(
      initialState.transportDiagnostics,
    );
  });
});
