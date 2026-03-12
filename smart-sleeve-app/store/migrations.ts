const DEFAULT_CALIBRATION = {
  baseline: [0, 0, 0, 0],
  mvc: [1, 1, 1, 1],
  calibratedAt: null,
};

const getUserState = (state: any) => state?.user ?? {};

export const migrations: Record<number, (state: any) => any> = {
  2: (state: any) => {
    const user = getUserState(state);

    return {
      ...state,
      user: {
        ...user,
        calibration: user.calibration ?? DEFAULT_CALIBRATION,
        showNormalized: user.showNormalized ?? false,
      },
    };
  },
  3: (state: any) => {
    const user = getUserState(state);

    return {
      ...state,
      user: {
        ...user,
        injuredSide: user.injuredSide ?? null,
        hasCompletedOnboarding: user.hasCompletedOnboarding ?? true,
      },
    };
  },
  4: (state: any) => {
    const user = getUserState(state);

    return {
      ...state,
      user: {
        ...user,
        injuryDetails: user.injuryDetails ?? null,
        therapyGoal: user.therapyGoal ?? null,
      },
    };
  },
  5: (state: any) => {
    const user = getUserState(state);

    return {
      ...state,
      user: {
        ...user,
        profileOwnerEmail: user.profileOwnerEmail ?? user.email ?? null,
      },
    };
  },
};
