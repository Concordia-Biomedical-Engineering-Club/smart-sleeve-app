import React from "react";
import { render } from "@testing-library/react-native";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { CircularDataCard } from "@/components/dashboard/CircularDataCard";
import { CALIBRATION_CHANNEL_LABELS } from "@/components/dashboard/CalibrationOverlay";
import { getGraphValue } from "@/components/dashboard/RMSGraph";
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
        goalValue="100"
        percentage={50}
      />,
    );
    expect(getByText("Test Chart")).toBeTruthy();
    expect(getByText("50")).toBeTruthy();
    expect(getByText("Goal:")).toBeTruthy();
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
});
