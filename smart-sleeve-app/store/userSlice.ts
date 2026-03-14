import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

export interface CalibrationCoefficients {
  baseline: number[];
  mvc: number[];
  calibratedAt: number | null;
}

export type InjuredSide = "LEFT" | "RIGHT";

export interface CalibrationsBySide {
  LEFT: CalibrationCoefficients;
  RIGHT: CalibrationCoefficients;
}

interface AuthPayload {
  email: string | null;
  isAuthenticated: boolean;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface UserState {
  isLoggedIn: boolean;
  email: string | null;
  isAuthenticated: boolean;
  calibrationsBySide: CalibrationsBySide;
  measurementSide: InjuredSide | null;
  showNormalized: boolean;
  injuredSide: InjuredSide | null;
  hasCompletedOnboarding: boolean;
  injuryDetails: string | null;
  therapyGoal: string | null;
  profileOwnerEmail: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
}

const CHANNELS = 4;

const createInitialCalibration = (): CalibrationCoefficients => ({
  baseline: new Array(CHANNELS).fill(0),
  mvc: new Array(CHANNELS).fill(1),
  calibratedAt: null,
});

const createInitialCalibrationsBySide = (): CalibrationsBySide => ({
  LEFT: createInitialCalibration(),
  RIGHT: createInitialCalibration(),
});

const getEffectiveMeasurementSide = (state: UserState): InjuredSide =>
  state.measurementSide ?? state.injuredSide ?? "LEFT";

const resetScopedUserState = (state: UserState) => {
  state.calibrationsBySide = createInitialCalibrationsBySide();
  state.measurementSide = null;
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
  calibrationsBySide: createInitialCalibrationsBySide(),
  measurementSide: null,
  showNormalized: false,
  injuredSide: null,
  hasCompletedOnboarding: false,
  injuryDetails: null,
  therapyGoal: null,
  profileOwnerEmail: null,
  syncStatus: "idle",
  lastSyncedAt: null,
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
      state.calibrationsBySide[getEffectiveMeasurementSide(state)] =
        action.payload;
    },
    resetCalibration: (state) => {
      state.calibrationsBySide[getEffectiveMeasurementSide(state)] =
        createInitialCalibration();
      state.showNormalized = false;
    },
    toggleNormalizedMode: (state) => {
      if (
        state.calibrationsBySide[getEffectiveMeasurementSide(state)]
          .calibratedAt !== null
      ) {
        state.showNormalized = !state.showNormalized;
      }
    },
    setInjuredSide: (state, action: PayloadAction<InjuredSide>) => {
      state.injuredSide = action.payload;
      state.measurementSide = action.payload;
      if (state.calibrationsBySide[action.payload].calibratedAt === null) {
        state.showNormalized = false;
      }
      state.profileOwnerEmail = state.email;
    },
    setMeasurementSide: (state, action: PayloadAction<InjuredSide>) => {
      state.measurementSide = action.payload;
      if (state.calibrationsBySide[action.payload].calibratedAt === null) {
        state.showNormalized = false;
      }
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
    setSyncStatus: (state, action: PayloadAction<SyncStatus>) => {
      state.syncStatus = action.payload;
    },
    setLastSyncedAt: (state, action: PayloadAction<number>) => {
      state.lastSyncedAt = action.payload;
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
  setMeasurementSide,
  setInjuryDetails,
  setTherapyGoal,
  completeOnboarding,
  setSyncStatus,
  setLastSyncedAt,
} = userSlice.actions;

export const selectMeasurementSide = (state: RootState) =>
  state.user.measurementSide ?? state.user.injuredSide ?? "LEFT";
export const selectCalibration = (state: RootState) =>
  state.user.calibrationsBySide[selectMeasurementSide(state)];
export const selectCalibrationForSide = (state: RootState, side: InjuredSide) =>
  state.user.calibrationsBySide[side];
export const selectIsCalibrated = (state: RootState) =>
  selectCalibration(state).calibratedAt !== null;
export const selectHasCalibrationForSide = (
  state: RootState,
  side: InjuredSide,
) => state.user.calibrationsBySide[side].calibratedAt !== null;
export const selectShowNormalized = (state: RootState) =>
  state.user.showNormalized;
export const selectInjuredSide = (state: RootState) => state.user.injuredSide;
export const selectHasCompletedOnboarding = (state: RootState) =>
  state.user.hasCompletedOnboarding;
export const selectInjuryDetails = (state: RootState) =>
  state.user.injuryDetails;
export const selectTherapyGoal = (state: RootState) => state.user.therapyGoal;
export const selectSyncStatus = (state: RootState) => state.user.syncStatus;
export const selectLastSyncedAt = (state: RootState) => state.user.lastSyncedAt;

export default userSlice.reducer;
