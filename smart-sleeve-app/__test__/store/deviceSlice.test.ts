import deviceReducer, {
  emgFrameReceived,
  imuFrameReceived,
  clearBuffers,
  selectEmgBufferLength,
  DeviceState,
  startWorkout,
} from '@/store/deviceSlice';
import { EMGData, IMUData } from '@/services/SleeveConnector/ISleeveConnector';

describe('deviceSlice', () => {
  const initialState: DeviceState = {
    connection: { connected: false },
    scenario: 'REST',
    isScanning: false,
    latestEMG: null,
    latestIMU: null,
    latestFeatures: null,
    emgBuffer: [],
    kneeAngleBuffer: [],
    workout: {
      phase: 'IDLE',
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
    sessionStatus: 'IDLE',
sessionStartTime: null,
recordingBuffer: [],
recordingKneeAngles: [],
  };

  test('should handle initial state', () => {
    expect(deviceReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  test('should append EMG data to buffer and maintain 500 max length', () => {
    let state: DeviceState = initialState;
    const mockEMG: EMGData = {
      header: 0xAA,
      timestamp: Date.now(),
      channels: [100, 200, 300, 400],
      checksum: 0,
    };

    for (let i = 0; i < 505; i++) {
      state = deviceReducer(state, emgFrameReceived({ ...mockEMG, timestamp: i }));
    }

    expect(state.emgBuffer.length).toBe(500);
    expect(state.latestEMG?.timestamp).toBe(504);
    expect(state.emgBuffer[0].timestamp).toBe(5);
  });

  test('should append IMU roll to kneeAngleBuffer and maintain 500 max length', () => {
    let state: DeviceState = initialState;
    const mockIMU: IMUData = {
      header: 0xBB,
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
  });

  test('should clear buffers', () => {
    let state: DeviceState = {
      ...initialState,
      emgBuffer: [{ header: 0, timestamp: 0, channels: [1, 2], checksum: 0 }],
      kneeAngleBuffer: [10, 20],
    };

    state = deviceReducer(state, clearBuffers());
    expect(state.emgBuffer).toEqual([]);
    expect(state.kneeAngleBuffer).toEqual([]);
  });

  test('selectEmgBufferLength should return correct length', () => {
    const state = {
      device: {
        ...initialState,
        emgBuffer: new Array(10).fill({ header: 0, timestamp: 0, channels: [], checksum: 0 }),
      }
    };
    // @ts-ignore - partial state for testing, RootState matches this structure
    expect(selectEmgBufferLength(state)).toBe(10);
  });

  test('should handle featuresUpdated', () => {
    const mockFeatures = { rms: [0.1, 0.2], mav: [0.05, 0.1] };
    const action = { type: 'device/featuresUpdated', payload: mockFeatures };
    const state = deviceReducer(initialState, action);
    expect(state.latestFeatures).toEqual(mockFeatures);
  });

  test('should handle startWorkout', () => {
    const mockWorkout = {
      exerciseId: 'quad-sets',
      exerciseName: 'Quadriceps Sets',
      targetSide: 'LEFT' as const,
      totalReps: 10,
      workDurationSec: 5,
      restDurationSec: 3,
    };
    const state = deviceReducer(initialState, startWorkout(mockWorkout));
    expect(state.workout.exerciseId).toBe(mockWorkout.exerciseId);
    expect(state.workout.phase).toBe('COUNTDOWN');
    expect(state.workout.workDurationSec).toBe(5);
  });

  test('should handle cancelWorkout', () => {
    const stateWithWorkout: DeviceState = {
      ...initialState,
      workout: {
        ...initialState.workout,
        phase: 'ACTIVE_WORK',
        exerciseId: 'quad-sets',
      },
    };
    const action = { type: 'device/cancelWorkout' };
    const state = deviceReducer(stateWithWorkout, action);
    expect(state.workout.phase).toBe('IDLE');
    expect(state.workout.exerciseId).toBeNull();
  });

  test('should handle completeWorkout', () => {
    const stateWithWorkout: DeviceState = {
      ...initialState,
      workout: {
        ...initialState.workout,
        phase: 'COMPLETING',
        exerciseId: 'quad-sets',
      },
    };
    const action = { type: 'device/completeWorkout' };
    const state = deviceReducer(stateWithWorkout, action);
    expect(state.workout.phase).toBe('IDLE');
    expect(state.workout.exerciseId).toBeNull();
  });

  test('should handle setFilteringEnabled', () => {
    const action = { type: 'device/setFilteringEnabled', payload: false };
    const state = deviceReducer(initialState, action);
    expect(state.isFilteringEnabled).toBe(false);
  });
});
