import React from "react";
import { render } from "@testing-library/react-native";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { CircularDataCard } from "@/components/dashboard/CircularDataCard";
import { CALIBRATION_CHANNEL_LABELS } from "@/components/dashboard/CalibrationOverlay";
import { getGraphValue, getRawGraphMax } from "@/components/dashboard/RMSGraph";
import {
  RAW_SIGNAL_BADGE_LABEL,
  RAW_SIGNAL_TOGGLE_LABEL,
} from "../../components/dashboard/signalDisplay";
import StatCard from "@/components/StatCard";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: "Heavy" },
  NotificationFeedbackType: { Success: "Success" },
}));

// Mock IconSymbol since it might use fonts not available in test env
jest.mock("@/components/ui/icon-symbol", () => ({
  IconSymbol: () => "IconSymbol",
}));

describe("Dashboard Components", () => {
  it("renders SegmentedControl with options", () => {
    const { getByText } = render(
      <SegmentedControl
        options={["Daily", "Weekly"]}
        selectedOption="Daily"
        onSelect={() => {}}
      />,
    );
    expect(getByText("Daily")).toBeTruthy();
    expect(getByText("Weekly")).toBeTruthy();
  });

  it("renders StatCard with value and label", () => {
    const { getByText } = render(<StatCard value="100" label="Test Label" />);
    expect(getByText("100")).toBeTruthy();
    expect(getByText("Test Label")).toBeTruthy();
  });

  it("renders CircularDataCard correctly", () => {
    const { getByText } = render(
      <CircularDataCard
        title="Test Chart"
        currentValue="50"
        goalValue="Goal: 100"
        percentage={50}
      />,
    );
    expect(getByText("Test Chart")).toBeTruthy();
    expect(getByText("50")).toBeTruthy();
    expect(getByText(/Goal:/)).toBeTruthy();
  });

  it("uses normalized graph values when normalized mode is enabled", () => {
    expect(
      getGraphValue(
        {
          rms: [0.8, 0.2, 0, 0],
          mav: [0.8, 0.2, 0, 0],
          rmsNormalized: [100, 100, 0, 0],
        },
        true,
        1,
      ),
    ).toBe(100);
  });

  it("keeps calibration channel labels consistent with the rest of the app", () => {
    expect(CALIBRATION_CHANNEL_LABELS).toEqual(["VMO", "VL", "ST", "BF"]);
  });

  it("uses stable raw-mode labels across the dashboard", () => {
    expect(RAW_SIGNAL_TOGGLE_LABEL).toBe("Raw RMS");
    expect(RAW_SIGNAL_BADGE_LABEL).toBe("RAW RMS");
  });

  it("uses dynamic raw graph scaling instead of a fixed mock-only ceiling", () => {
    expect(getRawGraphMax([0.02, 0.05, 0.08])).toBeCloseTo(0.1, 5);
    expect(getRawGraphMax([0.5, 1.5, 2])).toBeCloseTo(2.4, 5);
  });
});
