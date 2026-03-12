import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  ConnectionStatus,
  EMGData,
  IMUData,
} from "@/services/SleeveConnector/ISleeveConnector";
import { RootState } from "./store";
import type { NormalizedEMGFeatures } from "@/services/SignalProcessing/FeatureExtractor";

export type WorkoutPhase =
  | "IDLE"
  | "COUNTDOWN"
  | "ACTIVE_WORK"
  | "ACTIVE_REST"
  | "COMPLETING";

export type SessionStatus = "IDLE" | "RECORDING" | "SAVING";
export type TransportMode = "mock" | "real";

export interface TransportDiagnostics {
  requestedTransportMode: TransportMode;
  activeTransportMode: TransportMode;
  usingFallbackTransport: boolean;
  lastConnectionPhase: NonNullable<ConnectionStatus["phase"]>;
  lastConnectionReason: string | null;
  reconnectAttemptCount: number;
  lastEMGPacketTimestamp: number | null;
  lastIMUPacketTimestamp: number | null;
  emgPacketCount: number;
  imuPacketCount: number;
  discoveredCharacteristics: string[];
}

export interface WorkoutSession {
  phase: WorkoutPhase;
  exerciseId: string | null;
  exerciseName: string | null;
  targetSide: "LEFT" | "RIGHT" | null;
  startTime: number | null;
  currentRep: number;
  totalReps: number;
  phaseSecondsRemaining: number;
  workDurationSec: number;
  restDurationSec: number;
}

export interface DeviceState {
  connection: ConnectionStatus;
  scenario: "REST" | "FLEX" | "SQUAT";
  calibrationScenarioOverride: "REST" | "FLEX" | null;
  isScanning: boolean;
  latestEMG: EMGData | null;
  latestIMU: IMUData | null;
  latestFeatures: NormalizedEMGFeatures | null;
  latestCalibrationSample: number[] | null;
  emgBuffer: EMGData[];
  kneeAngleBuffer: number[];
  workout: WorkoutSession;
  isFilteringEnabled: boolean;
  isSignalWarmedUp: boolean;
  // ── Issue #7 — Session recording ──────────────────────────────────────────
  sessionStatus: SessionStatus;
  sessionStartTime: number | null;
  /** Time-series recording buffer — flushed to SQLite on endSession */
  recordingBuffer: EMGData[];
  recordingKneeAngles: IMUData[];
  transportDiagnostics: TransportDiagnostics;
}

const initialWorkout: WorkoutSession = {
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
};

const initialState: DeviceState = {
  connection: { connected: false },
  scenario: "REST",
  calibrationScenarioOverride: null,
  isScanning: false,
  latestEMG: null,
  latestIMU: null,
  latestFeatures: null,
  latestCalibrationSample: null,
  emgBuffer: [],
  kneeAngleBuffer: [],
  workout: initialWorkout,
  isFilteringEnabled: true,
  isSignalWarmedUp: false,
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
    discoveredCharacteristics: [],
  },
};

const syncScenario = (state: DeviceState) => {
  const { phase, exerciseId } = state.workout;
  if (phase === "ACTIVE_WORK") {
    state.scenario = exerciseId === "wall-slides" ? "SQUAT" : "FLEX";
  } else {
    state.scenario = "REST";
  }
};

const deviceSlice = createSlice({
  name: "device",
  initialState,
  reducers: {
    connectionChanged(state, action: PayloadAction<ConnectionStatus>) {
      state.connection = action.payload;
      state.transportDiagnostics.lastConnectionPhase =
        action.payload.phase ??
        (action.payload.connected ? "connected" : "disconnected");
      state.transportDiagnostics.lastConnectionReason =
        action.payload.reason ?? null;
      state.transportDiagnostics.reconnectAttemptCount =
        action.payload.reconnectAttempt ??
        state.transportDiagnostics.reconnectAttemptCount;
      state.transportDiagnostics.discoveredCharacteristics =
        action.payload.discoveredCharacteristics ??
        state.transportDiagnostics.discoveredCharacteristics;
      if (!action.payload.connected) {
        state.latestEMG = null;
        state.latestIMU = null;
        state.latestFeatures = null;
        state.latestCalibrationSample = null;
        state.emgBuffer = [];
        state.kneeAngleBuffer = [];
        state.calibrationScenarioOverride = null;
        state.isSignalWarmedUp = false;
      }
    },
    transportDiagnosticsChanged(
      state,
      action: PayloadAction<
        Pick<
          TransportDiagnostics,
          | "requestedTransportMode"
          | "activeTransportMode"
          | "usingFallbackTransport"
        >
      >,
    ) {
      state.transportDiagnostics = {
        ...state.transportDiagnostics,
        ...action.payload,
      };
    },
    scenarioChanged(state, action: PayloadAction<DeviceState["scenario"]>) {
      state.scenario = action.payload;
    },
    setCalibrationScenarioOverride(
      state,
      action: PayloadAction<DeviceState["calibrationScenarioOverride"]>,
    ) {
      state.calibrationScenarioOverride = action.payload;
    },
    setIsScanning(state, action: PayloadAction<boolean>) {
      state.isScanning = action.payload;
    },
    emgFrameReceived(state, action: PayloadAction<EMGData>) {
      state.latestEMG = action.payload;
      state.transportDiagnostics.lastEMGPacketTimestamp =
        action.payload.timestamp;
      state.transportDiagnostics.emgPacketCount += 1;
      state.emgBuffer.push(action.payload);
      if (state.emgBuffer.length > 500) {
        state.emgBuffer.shift();
      }
      // Append to recording buffer while session is active
      if (state.sessionStatus === "RECORDING") {
        state.recordingBuffer.push(action.payload);
      }
    },
    featuresUpdated(
      state,
      action: PayloadAction<DeviceState["latestFeatures"]>,
    ) {
      state.latestFeatures = action.payload;
    },
    calibrationSampleReceived(state, action: PayloadAction<number[]>) {
      state.latestCalibrationSample = action.payload;
    },
    signalWarmupChanged(state, action: PayloadAction<boolean>) {
      state.isSignalWarmedUp = action.payload;
    },
    imuFrameReceived(state, action: PayloadAction<IMUData>) {
      state.latestIMU = action.payload;
      state.transportDiagnostics.lastIMUPacketTimestamp =
        action.payload.timestamp;
      state.transportDiagnostics.imuPacketCount += 1;
      state.kneeAngleBuffer.push(action.payload.roll);
      if (state.kneeAngleBuffer.length > 500) {
        state.kneeAngleBuffer.shift();
      }
      // Append knee angle to recording buffer while session is active
      if (state.sessionStatus === "RECORDING") {
        state.recordingKneeAngles.push(action.payload);
      }
    },
    clearBuffers(state) {
      state.emgBuffer = [];
      state.kneeAngleBuffer = [];
    },

    // ── Issue #7 — Session recording actions ────────────────────────────────

    /**
     * Begin a recording session. Clears the recording buffer and sets
     * sessionStatus to RECORDING so incoming frames are captured.
     */
    startSession(state) {
      state.sessionStatus = "RECORDING";
      state.sessionStartTime = Date.now();
      state.recordingBuffer = [];
      state.recordingKneeAngles = [];
    },

    /**
     * Signal that saving is in progress. UI should show a saving indicator.
     * The actual SQLite write happens in SessionService (async, outside Redux).
     */
    endSession(state) {
      state.sessionStatus = "SAVING";
    },

    /**
     * Called after SQLite write completes successfully.
     * Clears the recording buffer and resets session state.
     */
    sessionSaved(state) {
      state.sessionStatus = "IDLE";
      state.sessionStartTime = null;
      state.recordingBuffer = [];
      state.recordingKneeAngles = [];
    },

    /**
     * Called if the SQLite write fails. Resets to IDLE without clearing buffer
     * so the caller can retry if needed.
     */
    sessionSaveFailed(state) {
      state.sessionStatus = "IDLE";
    },

    // ── Workout actions (unchanged) ─────────────────────────────────────────

    startWorkout(
      state,
      action: PayloadAction<{
        exerciseId: string;
        exerciseName: string;
        targetSide: "LEFT" | "RIGHT";
        totalReps: number;
        workDurationSec: number;
        restDurationSec: number;
      }>,
    ) {
      const {
        exerciseId,
        exerciseName,
        targetSide,
        totalReps,
        workDurationSec,
        restDurationSec,
      } = action.payload;
      state.workout = {
        phase: "COUNTDOWN",
        exerciseId,
        exerciseName,
        targetSide,
        startTime: Date.now(),
        currentRep: 0,
        totalReps,
        phaseSecondsRemaining: 3,
        workDurationSec,
        restDurationSec,
      };

      // ── Automatically start SQLite recording session ──
      state.sessionStatus = "RECORDING";
      state.sessionStartTime = Date.now();
      state.recordingBuffer = [];
      state.recordingKneeAngles = [];

      syncScenario(state);
    },
    workoutTick(state) {
      const w = state.workout;
      if (w.phase === "IDLE" || w.phase === "COMPLETING") return;
      const next = w.phaseSecondsRemaining - 1;
      if (next > 0) {
        w.phaseSecondsRemaining = next;
        return;
      }
      switch (w.phase) {
        case "COUNTDOWN":
          w.phase = "ACTIVE_WORK";
          w.phaseSecondsRemaining = w.workDurationSec;
          w.currentRep = 1;
          break;
        case "ACTIVE_WORK":
          w.phase = "ACTIVE_REST";
          w.phaseSecondsRemaining = w.restDurationSec;
          break;
        case "ACTIVE_REST":
          if (w.currentRep >= w.totalReps) {
            w.phase = "COMPLETING";
            w.phaseSecondsRemaining = 0;
          } else {
            w.phase = "ACTIVE_WORK";
            w.phaseSecondsRemaining = w.workDurationSec;
            w.currentRep += 1;
          }
          break;
      }
      syncScenario(state);
    },
    cancelWorkout(state) {
      state.workout = initialWorkout;
      syncScenario(state);
    },
    completeWorkout(state) {
      state.workout = initialWorkout;
      syncScenario(state);
    },
    setFilteringEnabled(state, action: PayloadAction<boolean>) {
      state.isFilteringEnabled = action.payload;
    },
  },
});

export const {
  connectionChanged,
  transportDiagnosticsChanged,
  scenarioChanged,
  setCalibrationScenarioOverride,
  setIsScanning,
  emgFrameReceived,
  featuresUpdated,
  calibrationSampleReceived,
  signalWarmupChanged,
  imuFrameReceived,
  clearBuffers,
  startSession,
  endSession,
  sessionSaved,
  sessionSaveFailed,
  startWorkout,
  workoutTick,
  cancelWorkout,
  completeWorkout,
  setFilteringEnabled,
} = deviceSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

const selectDevice = (state: RootState) => state.device;

export const selectConnectionStatus = createSelector(
  [selectDevice],
  (device) => device.connection.connected,
);

export const selectTransportDiagnostics = createSelector(
  [selectDevice],
  (device) => device.transportDiagnostics,
);
export const selectIsScanning = createSelector(
  [selectDevice],
  (device) => device.isScanning,
);
export const selectEmgBuffer = createSelector(
  [selectDevice],
  (device) => device.emgBuffer,
);
export const selectLatestFeatures = createSelector(
  [selectDevice],
  (device) => device.latestFeatures,
);
export const selectLatestCalibrationSample = createSelector(
  [selectDevice],
  (device) => device.latestCalibrationSample,
);
export const selectKneeAngleBuffer = createSelector(
  [selectDevice],
  (device) => device.kneeAngleBuffer,
);
export const selectEmgBufferLength = createSelector(
  [selectEmgBuffer],
  (buffer) => buffer.length,
);
export const selectWorkout = createSelector(
  [selectDevice],
  (device) => device.workout,
);
export const selectWorkoutPhase = createSelector(
  [selectWorkout],
  (workout) => workout.phase,
);
export const selectIsWorkoutActive = createSelector(
  [selectWorkoutPhase],
  (phase) => phase !== "IDLE",
);
export const selectSessionStatus = createSelector(
  [selectDevice],
  (device) => device.sessionStatus,
);
export const selectIsRecording = createSelector(
  [selectDevice],
  (device) => device.sessionStatus === "RECORDING",
);
export const selectRecordingBuffer = createSelector(
  [selectDevice],
  (device) => device.recordingBuffer,
);
export const selectRecordingKneeAngles = createSelector(
  [selectDevice],
  (device) => device.recordingKneeAngles,
);
export const selectSessionStartTime = createSelector(
  [selectDevice],
  (device) => device.sessionStartTime,
);
export const selectCalibrationScenarioOverride = createSelector(
  [selectDevice],
  (device) => device.calibrationScenarioOverride,
);
export const selectIsSignalWarmedUp = createSelector(
  [selectDevice],
  (device) => device.isSignalWarmedUp,
);

export default deviceSlice.reducer;
