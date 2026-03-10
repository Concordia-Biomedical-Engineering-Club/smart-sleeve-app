import {
  buildSessionComparison,
  computeCompletionRate,
  computeDeficitPercentageFromEMGFrames,
  computeIntensityScore,
  findPreviousSession,
  generateSessionRecommendation,
} from "@/services/ProgressAnalysis";
import { Session } from "@/services/Database";

function createSession(overrides: Partial<Session> = {}): Session {
  const overrideAnalytics = overrides.analytics ?? {};
  return {
    id: "session-current",
    userId: "patient@example.com",
    exerciseType: "quad-sets",
    side: "LEFT",
    timestamp: 2_000,
    duration: 80,
    avgFlexion: 85,
    exerciseIds: ["quad-sets"],
    synced: false,
    analytics: {
      avgActivation: 0.42,
      maxActivation: 0.78,
      deficitPercentage: 0,
      fatigueScore: 4,
      romDegrees: 96,
      exerciseQuality: 0.84,
      ...overrideAnalytics,
    },
    ...overrides,
  };
}

describe("ProgressAnalysis", () => {
  test("findPreviousSession returns the latest earlier session for the same exercise and side", () => {
    const current = createSession();
    const sessions = [
      createSession({ id: "later", timestamp: 3_000 }),
      createSession({ id: "wrong-side", timestamp: 1_900, side: "RIGHT" }),
      createSession({ id: "older-match", timestamp: 1_500 }),
      createSession({ id: "latest-match", timestamp: 1_800 }),
      createSession({
        id: "wrong-exercise",
        timestamp: 1_950,
        exerciseType: "heel-slides",
      }),
      current,
    ];

    expect(findPreviousSession(sessions, current)?.id).toBe("latest-match");
  });

  test("computeCompletionRate caps the estimated completion at 100 percent", () => {
    const fullSession = createSession({ duration: 80 });
    const partialSession = createSession({ duration: 40 });

    expect(computeCompletionRate(fullSession)).toBe(100);
    expect(computeCompletionRate(partialSession)).toBe(50);
  });

  test("computeCompletionRate uses persisted rep counts when available", () => {
    expect(
      computeCompletionRate(
        createSession({
          completedReps: 6,
          targetReps: 10,
          analytics: {
            avgActivation: 0.42,
            maxActivation: 0.78,
            deficitPercentage: 0,
            fatigueScore: 4,
            romDegrees: 96,
            exerciseQuality: 0.84,
            completionRate: 0,
          },
        }),
      ),
    ).toBe(60);
  });

  test("computeIntensityScore returns a bounded 0-10 score", () => {
    const highEffort = createSession({
      duration: 80,
      analytics: {
        avgActivation: 0.5,
        maxActivation: 0.85,
        deficitPercentage: 0,
        fatigueScore: 4,
        romDegrees: 102,
        exerciseQuality: 0.84,
      },
    });

    expect(computeIntensityScore(highEffort)).toBe(10);
    expect(
      computeIntensityScore(
        createSession({
          duration: 10,
          analytics: {
            avgActivation: 0.05,
            maxActivation: 0.1,
            deficitPercentage: 0,
            fatigueScore: 4,
            romDegrees: 10,
            exerciseQuality: 0.84,
          },
        }),
      ),
    ).toBeGreaterThanOrEqual(0);
  });

  test("computeDeficitPercentageFromEMGFrames measures VMO-VL imbalance", () => {
    expect(
      computeDeficitPercentageFromEMGFrames([
        { channels: [0.8, 0.2, 0, 0] },
        { channels: [0.6, 0.3, 0, 0] },
      ]),
    ).toBe(46.7);
  });

  test("buildSessionComparison computes user-facing deltas against the previous session", () => {
    const current = createSession({
      duration: 80,
      analytics: {
        avgActivation: 0.42,
        maxActivation: 0.78,
        deficitPercentage: 0,
        romDegrees: 100,
        exerciseQuality: 0.9,
        fatigueScore: 4,
      },
    });
    const previous = createSession({
      id: "previous",
      timestamp: 1_800,
      duration: 72,
      analytics: {
        avgActivation: 0.42,
        maxActivation: 0.78,
        deficitPercentage: 0,
        romDegrees: 92,
        exerciseQuality: 0.82,
        fatigueScore: 5,
      },
    });

    expect(buildSessionComparison(current, previous)).toEqual(
      expect.objectContaining({
        qualityDelta: 8,
        romDelta: 8,
        durationDelta: 8,
        fatigueDelta: -1,
      }),
    );
  });

  test("generateSessionRecommendation highlights regression and improvement cases", () => {
    const current = createSession({
      analytics: {
        avgActivation: 0.42,
        maxActivation: 0.78,
        deficitPercentage: 0,
        romDegrees: 105,
        exerciseQuality: 0.92,
        fatigueScore: 4,
      },
    });
    const previous = createSession({
      id: "previous",
      timestamp: 1_800,
      analytics: {
        avgActivation: 0.42,
        maxActivation: 0.78,
        deficitPercentage: 0,
        romDegrees: 96,
        exerciseQuality: 0.84,
        fatigueScore: 5,
      },
    });
    const warning = generateSessionRecommendation(
      createSession({
        analytics: {
          avgActivation: 0.42,
          maxActivation: 0.78,
          deficitPercentage: 0,
          exerciseQuality: 0.68,
          romDegrees: 90,
          fatigueScore: 4,
        },
      }),
      previous,
    );

    expect(generateSessionRecommendation(current, previous)).toEqual(
      expect.objectContaining({ tone: "positive" }),
    );
    expect(warning).toEqual(expect.objectContaining({ tone: "warning" }));
  });
});
