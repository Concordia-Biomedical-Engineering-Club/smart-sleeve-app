import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ConnectionStatus, EMGData, IMUData } from '@/services/SleeveConnector/ISleeveConnector';
import { RootState } from './store';

export type WorkoutPhase =
  | 'IDLE'
  | 'COUNTDOWN'
  | 'ACTIVE_WORK'
  | 'ACTIVE_REST'
  | 'COMPLETING';

export interface WorkoutSession {
  phase: WorkoutPhase;
  exerciseId: string | null;
  exerciseName: string | null;
  targetSide: 'LEFT' | 'RIGHT' | null;
  startTime: number | null;
  currentRep: number;
  totalReps: number;
  phaseSecondsRemaining: number;
}

export interface DeviceState {
  connection: ConnectionStatus;
  scenario: 'REST' | 'FLEX' | 'SQUAT';
  isScanning: boolean;
  latestEMG: EMGData | null;
  latestIMU: IMUData | null;
  latestFeatures: {
    rms: number[];
    mav: number[];
  } | null;
  emgBuffer: EMGData[];
  kneeAngleBuffer: number[];
  workout: WorkoutSession;
}

const initialWorkout: WorkoutSession = {
  phase: 'IDLE',
  exerciseId: null,
  exerciseName: null,
  targetSide: null,
  startTime: null,
  currentRep: 0,
  totalReps: 0,
  phaseSecondsRemaining: 0,
};

const initialState: DeviceState = {
  connection: { connected: false },
  scenario: 'REST',
  isScanning: false,
  latestEMG: null,
  latestIMU: null,
  latestFeatures: null,
  emgBuffer: [],
  kneeAngleBuffer: [],
  workout: initialWorkout,
};

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    connectionChanged(state, action: PayloadAction<ConnectionStatus>) {
      state.connection = action.payload;
      if (!action.payload.connected) {
        state.latestEMG = null;
        state.latestIMU = null;
        state.latestFeatures = null;
        state.emgBuffer = [];
        state.kneeAngleBuffer = [];
      }
    },
    scenarioChanged(state, action: PayloadAction<DeviceState['scenario']>) {
      state.scenario = action.payload;
    },
    setIsScanning(state, action: PayloadAction<boolean>) {
      state.isScanning = action.payload;
    },
    emgFrameReceived(state, action: PayloadAction<EMGData>) {
      state.latestEMG = action.payload;
      state.emgBuffer.push(action.payload);
      if (state.emgBuffer.length > 500) {
        state.emgBuffer.shift();
      }
    },
    featuresUpdated(state, action: PayloadAction<DeviceState['latestFeatures']>) {
      state.latestFeatures = action.payload;
    },
    imuFrameReceived(state, action: PayloadAction<IMUData>) {
      state.latestIMU = action.payload;
      state.kneeAngleBuffer.push(action.payload.roll);
      if (state.kneeAngleBuffer.length > 500) {
        state.kneeAngleBuffer.shift();
      }
    },
    clearBuffers(state) {
      state.emgBuffer = [];
      state.kneeAngleBuffer = [];
    },
    startWorkout(
      state,
      action: PayloadAction<{
        exerciseId: string;
        exerciseName: string;
        targetSide: 'LEFT' | 'RIGHT';
        totalReps: number;
      }>
    ) {
      const { exerciseId, exerciseName, targetSide, totalReps } = action.payload;
      state.workout = {
        phase: 'COUNTDOWN',
        exerciseId,
        exerciseName,
        targetSide,
        startTime: Date.now(),
        currentRep: 0,
        totalReps,
        phaseSecondsRemaining: 3,
      };
    },
    workoutTick(state) {
      const w = state.workout;
      if (w.phase === 'IDLE' || w.phase === 'COMPLETING') return;
      const next = w.phaseSecondsRemaining - 1;
      if (next > 0) {
        w.phaseSecondsRemaining = next;
        return;
      }
      switch (w.phase) {
        case 'COUNTDOWN':
          w.phase = 'ACTIVE_WORK';
          w.phaseSecondsRemaining = 5;
          w.currentRep = 1;
          break;
        case 'ACTIVE_WORK':
          w.phase = 'ACTIVE_REST';
          w.phaseSecondsRemaining = 3;
          break;
        case 'ACTIVE_REST':
          if (w.currentRep >= w.totalReps) {
            w.phase = 'COMPLETING';
            w.phaseSecondsRemaining = 0;
          } else {
            w.phase = 'ACTIVE_WORK';
            w.phaseSecondsRemaining = 5;
            w.currentRep += 1;
          }
          break;
      }
    },
    cancelWorkout(state) {
      state.workout = initialWorkout;
    },
    completeWorkout(state) {
      state.workout = initialWorkout;
    },
  },
});

export const {
  connectionChanged,
  scenarioChanged,
  setIsScanning,
  emgFrameReceived,
  featuresUpdated,
  imuFrameReceived,
  clearBuffers,
  startWorkout,
  workoutTick,
  cancelWorkout,
  completeWorkout,
} = deviceSlice.actions;

const selectDevice = (state: RootState) => state.device;

export const selectConnectionStatus = createSelector(
  [selectDevice],
  (device) => device.connection.connected
);
export const selectIsScanning = createSelector(
  [selectDevice],
  (device) => device.isScanning
);
export const selectEmgBuffer = createSelector(
  [selectDevice],
  (device) => device.emgBuffer
);
export const selectLatestFeatures = createSelector(
  [selectDevice],
  (device) => device.latestFeatures
);
export const selectKneeAngleBuffer = createSelector(
  [selectDevice],
  (device) => device.kneeAngleBuffer
);
export const selectEmgBufferLength = createSelector(
  [selectEmgBuffer],
  (buffer) => buffer.length
);
export const selectWorkout = createSelector(
  [selectDevice],
  (device) => device.workout
);
export const selectWorkoutPhase = createSelector(
  [selectWorkout],
  (workout) => workout.phase
);
export const selectIsWorkoutActive = createSelector(
  [selectWorkoutPhase],
  (phase) => phase !== 'IDLE'
);

export default deviceSlice.reducer;