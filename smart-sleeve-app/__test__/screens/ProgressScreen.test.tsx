import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import ProgressScreen from "@/app/(tabs)/progress";
import userReducer from "@/store/userSlice";
import deviceReducer from "@/store/deviceSlice";
import { fetchSessionsByFilters } from "@/services/Database";

const mockRouter = {
  push: jest.fn(),
};

jest.mock("@/services/Database", () => ({
  fetchSessionsByFilters: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@/components/ui/icon-symbol", () => ({
  IconSymbol: () => "IconSymbol",
}));

jest.mock("@/components/analytics/TrendChart", () => ({
  TrendChart: () => "TrendChart",
}));

const mockedFetchSessionsByFilters =
  fetchSessionsByFilters as jest.MockedFunction<typeof fetchSessionsByFilters>;

import type { UserState } from "@/store/userSlice";

function createInitialUserState(overrides: Partial<UserState> = {}): UserState {
  return {
    isLoggedIn: true,
    email: "patient@example.com",
    uid: "test-uid",
    isAuthenticated: true,
    calibrationsBySide: {
      LEFT: { baseline: [0, 0, 0, 0], mvc: [1, 1, 1, 1], calibratedAt: Date.now() },
      RIGHT: { baseline: [0, 0, 0, 0], mvc: [1, 1, 1, 1], calibratedAt: null },
    },
    measurementSide: "LEFT",
    showNormalized: true,
    injuredSide: "LEFT",
    hasCompletedOnboarding: true,
    injuryDetails: "Tear",
    therapyGoal: "Strength",
    profileOwnerEmail: "patient@example.com",
    syncStatus: "synced",
    lastSyncedAt: Date.now(),
    ...overrides,
  };
}

function createSession(overrides: any = {}) {
  return {
    id: "session-1",
    userId: "patient@example.com",
    exerciseType: "quad-sets",
    side: "LEFT",
    timestamp: Date.now(),
    duration: 80,
    avgFlexion: 95,
    completedReps: 8,
    targetReps: 10,
    exerciseIds: ["quad-sets"],
    synced: false,
      updatedAt: Date.now(),
    analytics: {
      avgActivation: 0.4,
      maxActivation: 0.75,
      deficitPercentage: 8,
      fatigueScore: 4,
      romDegrees: 96,
      exerciseQuality: 0.84,
      completionRate: 80,
      intensityScore: 6,
      ...overrides.analytics,
    },
    ...overrides,
  };
}

describe("ProgressScreen", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedFetchSessionsByFilters.mockResolvedValue([]);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function renderScreen(
    preloadedUser: UserState = createInitialUserState(),
  ) {
    const store = configureStore({
      reducer: {
        user: userReducer,
        device: deviceReducer,
      },
      preloadedState: {
        user: preloadedUser,
      },
    });

    return render(
      <Provider store={store}>
        <ProgressScreen />
      </Provider>,
    );
  }

  test("loads filtered sessions for the active user email", async () => {
    renderScreen();

    await waitFor(() => {
      expect(mockedFetchSessionsByFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "patient@example.com",
          startTimestamp: expect.any(Number),
        }),
      );
    });
  });

  test("falls back to the guest user history when no email is available", async () => {
    renderScreen(createInitialUserState({ isLoggedIn: false, email: null, isAuthenticated: false }));

    await waitFor(() => {
      expect(mockedFetchSessionsByFilters).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "guest_user" }),
      );
    });
  });

  test("applies side and exercise filters through the database query", async () => {
    mockedFetchSessionsByFilters.mockResolvedValue([createSession()]);
    const screen = renderScreen();

    await waitFor(() => {
      expect(mockedFetchSessionsByFilters).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByText("Left"));
    fireEvent.press(screen.getAllByText("Quadriceps Sets")[0]);

    await waitFor(() => {
      expect(mockedFetchSessionsByFilters).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userId: "patient@example.com",
          side: "LEFT",
          exerciseType: "quad-sets",
        }),
      );
    });
  });

  test("shows an error banner when filtered history fails to load", async () => {
    mockedFetchSessionsByFilters.mockRejectedValue(new Error("boom"));
    const screen = renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load progress history right now."),
      ).toBeTruthy();
    });
  });

  test("navigates to the session summary when a history card is pressed", async () => {
    mockedFetchSessionsByFilters.mockResolvedValue([
      createSession({ id: "session-123" }),
    ]);
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getAllByText("Quadriceps Sets").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByLabelText("Open Quadriceps Sets session"));
    expect(mockRouter.push).toHaveBeenCalledWith(
      "/session-summary/session-123",
    );
  });
});
