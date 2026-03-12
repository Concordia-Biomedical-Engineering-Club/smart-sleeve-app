import {
  computeActivationInsights,
  WARNING_THRESHOLD,
} from "@/services/SymmetryService";

describe("SymmetryService", () => {
  it("computes a single-leg activation score from normalized % MVC data", () => {
    const result = computeActivationInsights([95, 72, 110, 63]);

    expect(result.activationScore).toBe(83);
    expect(result.channels.map((channel) => channel.normalizedPct)).toEqual([
      95, 72, 110, 63,
    ]);
  });

  it("flags channels whose target gap exceeds the warning threshold", () => {
    const result = computeActivationInsights([100, 68, 71, 40]);

    expect(WARNING_THRESHOLD).toBe(30);
    expect(result.channels.map((channel) => channel.targetGap)).toEqual([
      0, 32, 29, 60,
    ]);
    expect(result.channels.map((channel) => channel.hasWarning)).toEqual([
      false,
      true,
      false,
      true,
    ]);
    expect(result.hasAnyWarning).toBe(true);
  });

  it("surfaces quad balance and hamstring load from the same-leg channels", () => {
    const result = computeActivationInsights([88, 61, 52, 84]);

    expect(result.vmoVlBalance).toBe(27);
    expect(result.hamstringGuarding).toBe(84);
  });
});
