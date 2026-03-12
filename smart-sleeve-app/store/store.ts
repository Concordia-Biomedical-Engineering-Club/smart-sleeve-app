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
import { migrations } from "./migrations";

const storage =
  Platform.OS === "web" && typeof window === "undefined"
    ? {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      }
    : AsyncStorage;

const rootPersistConfig = {
  key: "root",
  storage,
  version: 5,
  migrate: createMigrate(migrations, { debug: false }),
  whitelist: ["user"],
};

const devicePersistConfig = {
  key: "device",
  storage,
  whitelist: ["isFilteringEnabled"],
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
