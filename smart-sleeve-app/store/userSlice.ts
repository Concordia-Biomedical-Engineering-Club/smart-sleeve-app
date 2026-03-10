import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

// ── Calibration types ────────────────────────────────────────────────────────

/**
 * Per-channel calibration coefficients captured during the MVC flow.
 * Channels 0-3 map to: VMO, VL, RF, BF (the 4 critical channels per Biology Report).
 *
 * Normalized % = (liveRMS - baseline[ch]) / (mvc[ch] - baseline[ch]) * 100
 */
export interface CalibrationCoefficients {
  /** Average noise floor per channel captured during 5s Rest phase */
  baseline: number[];
  /** Peak 500ms RMS per channel captured during MVC Flex phase */
  mvc: number[];
  /** Unix timestamp (ms) when calibration was last completed */
  calibratedAt: number | null;
}

// ── State ─────────────────────────────────────────────────────────────────────

interface UserState {
  isLoggedIn: boolean;
  email: string | null;
  isAuthenticated: boolean;
  /** Calibration coefficients — persisted for the session */
  calibration: CalibrationCoefficients;
  /** Whether the dashboard is showing normalized (% MVC) or raw (μV) values */
  showNormalized: boolean;
}

const CHANNELS = 4;

const initialState: UserState = {
  isLoggedIn: false,
  email: null,
  isAuthenticated: false,
  calibration: {
    baseline: new Array(CHANNELS).fill(0),
    mvc: new Array(CHANNELS).fill(1),   // default to 1 to avoid division by zero
    calibratedAt: null,
  },
  showNormalized: false,
};

// ── Slice ─────────────────────────────────────────────────────────────────────

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

    /**
     * Save completed calibration coefficients to the store.
     * Called by CalibrationOverlay once the user confirms.
     */
    setCalibration: (state, action: PayloadAction<CalibrationCoefficients>) => {
      state.calibration = action.payload;
    },

    /**
     * Reset calibration back to defaults (forces re-calibration).
     */
    resetCalibration: (state) => {
      state.calibration = initialState.calibration;
      state.showNormalized = false;
    },

    /**
     * Toggle the dashboard between raw μV and normalized % MVC display.
     * Only allowed when calibration has been completed.
     */
    toggleNormalizedMode: (state) => {
      if (state.calibration.calibratedAt !== null) {
        state.showNormalized = !state.showNormalized;
      }
    },
  },
});

export const {
  login,
  signup,
  logout,
  setCalibration,
  resetCalibration,
  toggleNormalizedMode,
} = userSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectCalibration = (state: RootState) => state.user.calibration;
export const selectIsCalibrated = (state: RootState) =>
  state.user.calibration.calibratedAt !== null;
export const selectShowNormalized = (state: RootState) => state.user.showNormalized;

export default userSlice.reducer;