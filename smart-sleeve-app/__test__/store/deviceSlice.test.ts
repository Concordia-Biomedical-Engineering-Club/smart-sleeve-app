import deviceReducer, {
  emgFrameReceived,
  imuFrameReceived,
  clearBuffers,
  selectEmgBufferLength,
  DeviceState,
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

    // Add 505 points
    for (let i = 0; i < 505; i++) {
      state = deviceReducer(state, emgFrameReceived({ ...mockEMG, timestamp: i }));
    }

    expect(state.emgBuffer.length).toBe(500);
    expect(state.latestEMG?.timestamp).toBe(504);
    expect(state.emgBuffer[0].timestamp).toBe(5); // First 5 should be shifted out
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
});
