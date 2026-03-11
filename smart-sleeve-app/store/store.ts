import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  createMigrate,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import userReducer from "./userSlice";
import deviceReducer from "./deviceSlice";

const storage =
  Platform.OS === "web" && typeof window === "undefined"
    ? {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      }
    : AsyncStorage;

const migrations: any = {
  2: (state: any) => ({
    ...state,
    user: {
      ...state.user,
      calibration: {
        baseline: [0, 0, 0, 0],
        mvc: [1, 1, 1, 1],
        calibratedAt: null,
      },
      showNormalized: false,
    },
  }),
  3: (state: any) => ({
    ...state,
    user: {
      ...state.user,
      injuredSide: null,
      hasCompletedOnboarding: false,
    },
  }),
  4: (state: any) => ({
    ...state,
    user: {
      ...state.user,
      injuryDetails: null,
      therapyGoal: null,
    },
  }),
  
};

const rootPersistConfig = {
  key: "root",
  storage,
  version: 4,
  migrate: createMigrate(migrations, { debug: false }),
  whitelist: ["user"],
};

const devicePersistConfig = {
  key: 'device',
  storage,
  whitelist: ['isFilteringEnabled'],
};

const rootReducer = combineReducers({
  user: userReducer,
  device: persistReducer(devicePersistConfig, deviceReducer),
});

const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;