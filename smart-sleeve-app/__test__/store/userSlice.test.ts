import reducer, {
  completeOnboarding,
  login,
  logout,
  setCalibration,
  setInjuredSide,
  setInjuryDetails,
  setMeasurementSide,
  setTherapyGoal,
  toggleNormalizedMode,
  type CalibrationCoefficients,
} from "@/store/userSlice";

const calibratedState: CalibrationCoefficients = {
  baseline: [0.1, 0.2, 0.3, 0.4],
  mvc: [1.1, 1.2, 1.3, 1.4],
  calibratedAt: 123456,
};

describe("userSlice onboarding ownership", () => {
  it("preserves onboarding data when the same athlete signs back in", () => {
    let state = reducer(
      undefined,
      login({ email: "athlete@example.com", isAuthenticated: true }),
    );
    state = reducer(state, setInjuredSide("LEFT"));
    state = reducer(state, setInjuryDetails("ACL reconstruction"));
    state = reducer(state, setTherapyGoal("strength"));
    state = reducer(state, completeOnboarding());
    state = reducer(state, logout());

    const nextState = reducer(
      state,
      login({ email: "athlete@example.com", isAuthenticated: true }),
    );

    expect(nextState.hasCompletedOnboarding).toBe(true);
    expect(nextState.injuredSide).toBe("LEFT");
    expect(nextState.injuryDetails).toBe("ACL reconstruction");
    expect(nextState.therapyGoal).toBe("strength");
  });

  it("resets onboarding and calibration data when a different athlete signs in", () => {
    let state = reducer(
      undefined,
      login({ email: "athlete@example.com", isAuthenticated: true }),
    );
    state = reducer(state, setInjuredSide("RIGHT"));
    state = reducer(state, setInjuryDetails("Meniscus repair"));
    state = reducer(state, setTherapyGoal("range"));
    state = reducer(state, setCalibration(calibratedState));
    state = reducer(state, toggleNormalizedMode());
    state = reducer(state, completeOnboarding());
    state = reducer(state, logout());

    const nextState = reducer(
      state,
      login({ email: "new-athlete@example.com", isAuthenticated: true }),
    );

    expect(nextState.hasCompletedOnboarding).toBe(false);
    expect(nextState.injuredSide).toBeNull();
    expect(nextState.injuryDetails).toBeNull();
    expect(nextState.therapyGoal).toBeNull();
    expect(nextState.showNormalized).toBe(false);
    expect(nextState.calibrationsBySide.RIGHT.calibratedAt).toBeNull();
    expect(nextState.profileOwnerEmail).toBe("new-athlete@example.com");
  });

  it("stores calibration separately for each measured side", () => {
    let state = reducer(
      undefined,
      login({ email: "athlete@example.com", isAuthenticated: true }),
    );
    state = reducer(state, setInjuredSide("LEFT"));
    state = reducer(state, setCalibration(calibratedState));
    state = reducer(state, setMeasurementSide("RIGHT"));
    state = reducer(
      state,
      setCalibration({
        ...calibratedState,
        calibratedAt: 999999,
      }),
    );

    expect(state.calibrationsBySide.LEFT.calibratedAt).toBe(123456);
    expect(state.calibrationsBySide.RIGHT.calibratedAt).toBe(999999);
  });
});
