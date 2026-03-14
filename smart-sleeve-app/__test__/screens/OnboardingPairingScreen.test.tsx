import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { Animated } from "react-native";
import OnboardingPairing from "@/app/onboarding/pairing";
import userReducer from "@/store/userSlice";
import deviceReducer from "@/store/deviceSlice";
import { createMockSleeveConnector } from "@/__test__/helpers/createMockSleeveConnector";

const mockRouter = {
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

const mockConnector = createMockSleeveConnector();

jest.mock("@/hooks/useSleeve", () => ({
  useSleeve: () => mockConnector,
}));

describe("OnboardingPairing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Animated, "loop").mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  function renderScreen() {
    const store = configureStore({
      reducer: {
        user: userReducer,
        device: deviceReducer,
      },
    });

    const screen = render(
      <Provider store={store}>
        <OnboardingPairing />
      </Provider>,
    );

    return { screen, store };
  }

  it("scans and connects to the demo sleeve before completing onboarding", async () => {
    mockConnector.scan.mockResolvedValue(["MockSleeve-01"]);
    mockConnector.connect.mockResolvedValue();

    const { screen, store } = renderScreen();

    expect(screen.getByTestId("onboarding-skip-step-button")).toBeTruthy();

    fireEvent.press(screen.getByTestId("onboarding-search-device-button"));

    await waitFor(() => {
      expect(mockConnector.scan).toHaveBeenCalledTimes(1);
      expect(mockConnector.connect).toHaveBeenCalledWith("MockSleeve-01");
    });

    await waitFor(() => {
      expect(screen.getByText("Connected!")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("onboarding-go-dashboard-button"));

    expect(store.getState().user.hasCompletedOnboarding).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)/dashboard");
  });

  it("shows a retry state when the demo connector cannot be reached", async () => {
    mockConnector.scan.mockRejectedValue(new Error("scan failed"));

    const { screen, store } = renderScreen();

    fireEvent.press(screen.getByTestId("onboarding-search-device-button"));

    await waitFor(() => {
      expect(screen.getByText("Pairing Failed")).toBeTruthy();
      expect(screen.getByTestId("onboarding-try-again-button")).toBeTruthy();
    });

    expect(store.getState().user.hasCompletedOnboarding).toBe(false);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
