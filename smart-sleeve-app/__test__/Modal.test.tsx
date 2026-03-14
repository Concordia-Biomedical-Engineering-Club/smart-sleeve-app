import React from "react";
import { render } from "@testing-library/react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ModalScreen from "../app/modal";
import userReducer from "../store/userSlice";

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
}));

// Mock expo-status-bar
jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@/services/auth", () => ({
  logout: jest.fn(),
}));

jest.mock("@/components/ui/icon-symbol", () => ({
  IconSymbol: () => null,
}));

describe("ModalScreen", () => {
  const store = configureStore({
    reducer: {
      user: userReducer,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Settings title and section headers", () => {
    const { getByText } = render(
      <Provider store={store}>
        <ModalScreen />
      </Provider>,
    );

    // Check title text
    expect(getByText("Settings")).toBeTruthy();

    // Check section headers
    expect(getByText("ACCOUNT")).toBeTruthy();
    expect(getByText("SUPPORT")).toBeTruthy();
    expect(getByText("DIAGNOSTICS & TOOLS")).toBeTruthy();

    // Check specific items
    expect(getByText("Personal Information")).toBeTruthy();
    expect(getByText("Test BLE Connectivity")).toBeTruthy();
    expect(getByText("Database Debug")).toBeTruthy();
    expect(getByText("Sign Out")).toBeTruthy();
  });
});
