import AsyncStorage from "@react-native-async-storage/async-storage";
import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import userReducer from "./userSlice";
import deviceReducer from "./deviceSlice";

const rootPersistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["user"], // persist the 'user' reducer
};

const rootReducer = combineReducers({
  user: userReducer,
  device: deviceReducer,
});

const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;