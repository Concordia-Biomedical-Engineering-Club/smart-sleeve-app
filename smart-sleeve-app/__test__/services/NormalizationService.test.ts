import {
  addSample,
  BASELINE_DURATION_SEC,
  buildCoefficients,
  finalizeBaseline,
  finalizeMVC,
  normalize,
  reset,
  startBaseline,
  startMVC,
} from "@/services/NormalizationService";

describe("NormalizationService", () => {
  afterEach(() => {
    reset();
  });

  it("computes baseline from direct filtered samples using RMS, not arithmetic mean", () => {
    startBaseline();

    addSample([1, 0, 0, 0]);
    addSample([-1, 0, 0, 0]);

    expect(finalizeBaseline()).toEqual([1, 0, 0, 0]);
  });

  it("computes MVC from the strongest 500ms sample window", () => {
    startMVC();

    for (let index = 0; index < 25; index += 1) {
      addSample([0.5, 0.5, 0.5, 0.5]);
    }

    for (let index = 0; index < 25; index += 1) {
      addSample([2, 2, 2, 2]);
    }

    expect(finalizeMVC()).toEqual([2, 2, 2, 2]);
  });

  it("still clamps normalized output into the supported percent MVC range", () => {
    const coeffs = buildCoefficients([0, 0, 0, 0], [1, 1, 1, 1]);

    expect(normalize([2, -1, 0.5, 1.5], coeffs)).toEqual([150, 0, 50, 150]);
    expect(BASELINE_DURATION_SEC).toBe(5);
  });
});
