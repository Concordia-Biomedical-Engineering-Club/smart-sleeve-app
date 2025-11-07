import { createSlice } from '@reduxjs/toolkit';

interface DeviceState {
  isConnected: boolean;
  mockData: number[];
}

const initialState: DeviceState = {
  isConnected: false,
  mockData: [],
};

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    connectDevice: (state) => {
      state.isConnected = true;
    },
    disconnectDevice: (state) => {
      state.isConnected = false;
    },
    updateMockData: (state, action) => {
      state.mockData = action.payload;
    },
  },
});

export const { connectDevice, disconnectDevice, updateMockData } = deviceSlice.actions;
export default deviceSlice.reducer;
