import { migrations } from "@/store/migrations";

describe("store migrations", () => {
  it("does not force legacy installs back through onboarding during v3 migration", () => {
    const migrated = migrations[3]({
      user: {
        email: "existing@example.com",
      },
    });

    expect(migrated.user.hasCompletedOnboarding).toBe(true);
    expect(migrated.user.injuredSide).toBeNull();
  });

  it("preserves explicit onboarding flags when migrating v3 state", () => {
    const migrated = migrations[3]({
      user: {
        email: "existing@example.com",
        hasCompletedOnboarding: false,
        injuredSide: "LEFT",
      },
    });

    expect(migrated.user.hasCompletedOnboarding).toBe(false);
    expect(migrated.user.injuredSide).toBe("LEFT");
  });

  it("assigns a profile owner email during v5 migration when one is missing", () => {
    const migrated = migrations[5]({
      user: {
        email: "athlete@example.com",
        hasCompletedOnboarding: true,
      },
    });

    expect(migrated.user.profileOwnerEmail).toBe("athlete@example.com");
  });

  it("moves the legacy single calibration onto the injured side during v6 migration", () => {
    const migrated = migrations[6]({
      user: {
        injuredSide: "RIGHT",
        calibration: {
          baseline: [0.1, 0.2, 0.3, 0.4],
          mvc: [1.1, 1.2, 1.3, 1.4],
          calibratedAt: 123,
        },
      },
    });

    expect(migrated.user.measurementSide).toBe("RIGHT");
    expect(migrated.user.calibrationsBySide.RIGHT.calibratedAt).toBe(123);
    expect(migrated.user.calibrationsBySide.LEFT.calibratedAt).toBeNull();
  });
});
