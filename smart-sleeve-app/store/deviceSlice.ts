import { ConnectionStatus, EMGData, IMUData } from '@/services/MockBleService/ISleeveConnector';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DeviceState {
  connection:ConnectionStatus
  scenario: "REST"|"FLEX"|"SQUAT";
  latestEMG:EMGData|null;
  latestIMU:IMUData|null;

}


const initialState: DeviceState = {
  connection: { connected: false },
  scenario: "REST",
  latestEMG: null,
  latestIMU: null,
};

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    connectionChanged(state,action:PayloadAction<ConnectionStatus>){
      state.connection=action.payload;
      if(!action.payload.connected){
        state.latestEMG=null;
        state.latestIMU=null;
      }
    },
    scenarioChanged(state, action:PayloadAction<DeviceState["scenario"]>){
      state.scenario=action.payload;
    },
    emgFrameReceived(state,action:PayloadAction<EMGData>){
      state.latestEMG=action.payload;
    },
    imuFrameReceived(state,action:PayloadAction<IMUData>){
      state.latestIMU=action.payload;
    }
  },

});

export const { connectionChanged,scenarioChanged,emgFrameReceived,imuFrameReceived } = deviceSlice.actions;
export default deviceSlice.reducer;
