import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

export interface CalibrationCoefficients {
  baseline: number[];
  mvc: number[];
  calibratedAt: number | null;
}

export type InjuredSide = 'LEFT' | 'RIGHT';

interface UserState {
  isLoggedIn: boolean;
  email: string | null;
  isAuthenticated: boolean;
  calibration: CalibrationCoefficients;
  showNormalized: boolean;
  injuredSide: InjuredSide | null;
  hasCompletedOnboarding: boolean;
  injuryDetails: string | null;
  therapyGoal: string | null;
}

const CHANNELS = 4;

const initialState: UserState = {
  isLoggedIn: false,
  email: null,
  isAuthenticated: false,
  calibration: {
    baseline: new Array(CHANNELS).fill(0),
    mvc: new Array(CHANNELS).fill(1),
    calibratedAt: null,
  },
  showNormalized: false,
  injuredSide: null,
  hasCompletedOnboarding: false,
  injuryDetails: null,
  therapyGoal: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    login: (state, action) => {
      state.isLoggedIn = true;
      state.email = action.payload.email;
      state.isAuthenticated = action.payload.isAuthenticated;
    },
    signup: (state, action) => {
      state.isLoggedIn = true;
      state.email = action.payload.email;
      state.isAuthenticated = action.payload.isAuthenticated;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.email = null;
      state.isAuthenticated = false;
    },
    setCalibration: (state, action: PayloadAction<CalibrationCoefficients>) => {
      state.calibration = action.payload;
    },
    resetCalibration: (state) => {
      state.calibration = initialState.calibration;
      state.showNormalized = false;
    },
    toggleNormalizedMode: (state) => {
      if (state.calibration.calibratedAt !== null) {
        state.showNormalized = !state.showNormalized;
      }
    },
    setInjuredSide: (state, action: PayloadAction<InjuredSide>) => {
      state.injuredSide = action.payload;
    },
    setInjuryDetails: (state, action: PayloadAction<string>) => {
      state.injuryDetails = action.payload;
    },
    setTherapyGoal: (state, action: PayloadAction<string>) => {
      state.therapyGoal = action.payload;
    },
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true;
    },
  },
});

export const {
  login, signup, logout,
  setCalibration, resetCalibration, toggleNormalizedMode,
  setInjuredSide, setInjuryDetails, setTherapyGoal, completeOnboarding,
} = userSlice.actions;

export const selectCalibration = (state: RootState) => state.user.calibration;
export const selectIsCalibrated = (state: RootState) => state.user.calibration.calibratedAt !== null;
export const selectShowNormalized = (state: RootState) => state.user.showNormalized;
export const selectInjuredSide = (state: RootState) => state.user.injuredSide;
export const selectHasCompletedOnboarding = (state: RootState) => state.user.hasCompletedOnboarding;
export const selectInjuryDetails = (state: RootState) => state.user.injuryDetails;
export const selectTherapyGoal = (state: RootState) => state.user.therapyGoal;

export default userSlice.reducer;