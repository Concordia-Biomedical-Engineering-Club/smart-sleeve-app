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
});
