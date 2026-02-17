import { createSelector } from '@reduxjs/toolkit';
import { ConnectionStatus, EMGData, IMUData } from '@/services/SleeveConnector/ISleeveConnector';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from './store';

export interface DeviceState {
  connection: ConnectionStatus;
  scenario: "REST" | "FLEX" | "SQUAT";
  isScanning: boolean;
  latestEMG: EMGData | null;
  latestIMU: IMUData | null;
  latestFeatures: {
    rms: number[];
    mav: number[];
  } | null;
  emgBuffer: EMGData[];
  kneeAngleBuffer: number[];
}

const initialState: DeviceState = {
  connection: { connected: false },
  scenario: "REST",
  isScanning: false,
  latestEMG: null,
  latestIMU: null,
  latestFeatures: null,
  emgBuffer: [],
  kneeAngleBuffer: [],
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
    scenarioChanged(state, action: PayloadAction<DeviceState["scenario"]>) {
      state.scenario = action.payload;
    },
    setIsScanning(state, action: PayloadAction<boolean>) {
      state.isScanning = action.payload;
    },
    emgFrameReceived(state, action: PayloadAction<EMGData>) {
      state.latestEMG = action.payload;
      // FIFO buffer for EMG waveform (max 500 points)
      state.emgBuffer.push(action.payload);
      if (state.emgBuffer.length > 500) {
        state.emgBuffer.shift();
      }
    },
    featuresUpdated(state, action: PayloadAction<DeviceState["latestFeatures"]>) {
      state.latestFeatures = action.payload;
    },
    imuFrameReceived(state, action: PayloadAction<IMUData>) {
      state.latestIMU = action.payload;
      // FIFO buffer for Knee Angle (roll) (max 500 points)
      state.kneeAngleBuffer.push(action.payload.roll);
      if (state.kneeAngleBuffer.length > 500) {
        state.kneeAngleBuffer.shift();
      }
    },
    clearBuffers(state) {
      state.emgBuffer = [];
      state.kneeAngleBuffer = [];
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
} = deviceSlice.actions;

// Selectors
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

export default deviceSlice.reducer;
