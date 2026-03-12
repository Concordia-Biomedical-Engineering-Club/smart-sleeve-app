import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

export interface CalibrationCoefficients {
  baseline: number[];
  mvc: number[];
  calibratedAt: number | null;
}

export type InjuredSide = "LEFT" | "RIGHT";

interface AuthPayload {
  email: string | null;
  isAuthenticated: boolean;
}

export interface UserState {
  isLoggedIn: boolean;
  email: string | null;
  isAuthenticated: boolean;
  calibration: CalibrationCoefficients;
  showNormalized: boolean;
  injuredSide: InjuredSide | null;
  hasCompletedOnboarding: boolean;
  injuryDetails: string | null;
  therapyGoal: string | null;
  profileOwnerEmail: string | null;
}

const CHANNELS = 4;

const createInitialCalibration = (): CalibrationCoefficients => ({
  baseline: new Array(CHANNELS).fill(0),
  mvc: new Array(CHANNELS).fill(1),
  calibratedAt: null,
});

const resetScopedUserState = (state: UserState) => {
  state.calibration = createInitialCalibration();
  state.showNormalized = false;
  state.injuredSide = null;
  state.hasCompletedOnboarding = false;
  state.injuryDetails = null;
  state.therapyGoal = null;
};

const hydrateAuthenticatedUser = (
  state: UserState,
  action: PayloadAction<AuthPayload>,
) => {
  const nextEmail = action.payload.email;

  state.isLoggedIn = true;
  state.email = nextEmail;
  state.isAuthenticated = action.payload.isAuthenticated;

  if (!nextEmail) {
    return;
  }

  const hasLegacyUnownedProfile =
    state.profileOwnerEmail === null &&
    (state.hasCompletedOnboarding ||
      state.injuredSide !== null ||
      state.injuryDetails !== null ||
      state.therapyGoal !== null);

  if (
    state.profileOwnerEmail !== nextEmail &&
    (state.profileOwnerEmail !== null || hasLegacyUnownedProfile)
  ) {
    resetScopedUserState(state);
  }

  state.profileOwnerEmail = nextEmail;
};

const initialState: UserState = {
  isLoggedIn: false,
  email: null,
  isAuthenticated: false,
  calibration: createInitialCalibration(),
  showNormalized: false,
  injuredSide: null,
  hasCompletedOnboarding: false,
  injuryDetails: null,
  therapyGoal: null,
  profileOwnerEmail: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<AuthPayload>) => {
      hydrateAuthenticatedUser(state, action);
    },
    signup: (state, action: PayloadAction<AuthPayload>) => {
      hydrateAuthenticatedUser(state, action);
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
      state.calibration = createInitialCalibration();
      state.showNormalized = false;
    },
    toggleNormalizedMode: (state) => {
      if (state.calibration.calibratedAt !== null) {
        state.showNormalized = !state.showNormalized;
      }
    },
    setInjuredSide: (state, action: PayloadAction<InjuredSide>) => {
      state.injuredSide = action.payload;
      state.profileOwnerEmail = state.email;
    },
    setInjuryDetails: (state, action: PayloadAction<string>) => {
      state.injuryDetails = action.payload;
      state.profileOwnerEmail = state.email;
    },
    setTherapyGoal: (state, action: PayloadAction<string>) => {
      state.therapyGoal = action.payload;
      state.profileOwnerEmail = state.email;
    },
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true;
      state.profileOwnerEmail = state.email;
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
  setInjuredSide,
  setInjuryDetails,
  setTherapyGoal,
  completeOnboarding,
} = userSlice.actions;

export const selectCalibration = (state: RootState) => state.user.calibration;
export const selectIsCalibrated = (state: RootState) =>
  state.user.calibration.calibratedAt !== null;
export const selectShowNormalized = (state: RootState) =>
  state.user.showNormalized;
export const selectInjuredSide = (state: RootState) => state.user.injuredSide;
export const selectHasCompletedOnboarding = (state: RootState) =>
  state.user.hasCompletedOnboarding;
export const selectInjuryDetails = (state: RootState) =>
  state.user.injuryDetails;
export const selectTherapyGoal = (state: RootState) => state.user.therapyGoal;

export default userSlice.reducer;
