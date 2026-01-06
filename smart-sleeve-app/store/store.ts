import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import userReducer from "./userSlice";
import deviceReducer from "./deviceSlice";

// Fallback storage for SSR (Web)
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
  whitelist: ["user"], // persist the 'user' reducer
};

const rootReducer = combineReducers({
  user: userReducer,
  device: deviceReducer,
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