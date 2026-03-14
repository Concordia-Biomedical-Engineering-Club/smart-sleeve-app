import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import SessionSummaryScreen from "@/app/session-summary/[id]";
import userReducer from "@/store/userSlice";
import deviceReducer from "@/store/deviceSlice";
import {
  fetchEMGSamplesBySession,
  fetchPreviousSessionForExercise,
  fetchSessionById,
} from "@/services/Database";

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

jest.mock("@/services/Database", () => ({
  fetchSessionById: jest.fn(),
  fetchPreviousSessionForExercise: jest.fn(),
  fetchEMGSamplesBySession: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "session-current" }),
  useRouter: () => mockRouter,
}));

jest.mock("react-native-chart-kit", () => ({
  LineChart: () => "LineChart",
}));

jest.mock("@/components/ui/icon-symbol", () => ({
  IconSymbol: () => "IconSymbol",
}));

const mockedFetchSessionById = fetchSessionById as jest.MockedFunction<
  typeof fetchSessionById
>;
const mockedFetchPreviousSessionForExercise =
  fetchPreviousSessionForExercise as jest.MockedFunction<
    typeof fetchPreviousSessionForExercise
  >;
const mockedFetchEMGSamplesBySession =
  fetchEMGSamplesBySession as jest.MockedFunction<
    typeof fetchEMGSamplesBySession
  >;

function createSession(overrides: any = {}) {
  return {
    id: "session-current",
    userId: "patient@example.com",
    exerciseType: "quad-sets",
    side: "LEFT",
    timestamp: 2_000,
    duration: 80,
    avgFlexion: 95,
    completedReps: 8,
    targetReps: 10,
    exerciseIds: ["quad-sets"],
    synced: false,
      updatedAt: Date.now(),
    analytics: {
      avgActivation: 0.42,
      maxActivation: 0.78,
      deficitPercentage: 10,
      fatigueScore: 4,
      romDegrees: 96,
      exerciseQuality: 0.84,
      completionRate: 80,
      intensityScore: 6.2,
      ...overrides.analytics,
    },
    ...overrides,
  };
}

describe("SessionSummaryScreen", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedFetchEMGSamplesBySession.mockResolvedValue([]);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function renderScreen() {
    const store = configureStore({
      reducer: {
        user: userReducer,
        device: deviceReducer,
      },
    });

    return render(
      <Provider store={store}>
        <SessionSummaryScreen />
      </Provider>,
    );
  }

  test("renders comparison metrics and recommendation when a previous session exists", async () => {
    mockedFetchSessionById.mockResolvedValue(createSession());
    mockedFetchPreviousSessionForExercise.mockResolvedValue(
      createSession({
        id: "session-previous",
        timestamp: 1_000,
        duration: 70,
        analytics: {
          romDegrees: 88,
          exerciseQuality: 0.76,
          fatigueScore: 5,
        },
      }),
    );

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Progress Comparison")).toBeTruthy();
    });

    expect(screen.getByText("+8.0%")).toBeTruthy();
    expect(screen.getByText("+8.0°")).toBeTruthy();
    expect(screen.getByText("Clear progress vs. last session")).toBeTruthy();
  });

  test("renders first-session fallback when no previous session exists", async () => {
    mockedFetchSessionById.mockResolvedValue(createSession());
    mockedFetchPreviousSessionForExercise.mockResolvedValue(null);

    const screen = renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText("No prior session on this exercise yet"),
      ).toBeTruthy();
    });

    expect(screen.getByText(/This is your first saved session/)).toBeTruthy();
  });

  test("shows an error banner and supports back navigation when loading fails", async () => {
    mockedFetchSessionById.mockRejectedValue(new Error("boom"));

    const screen = renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load this session summary."),
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
