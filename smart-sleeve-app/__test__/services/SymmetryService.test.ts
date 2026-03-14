import {
  buildBilateralComparison,
  findLatestBilateralComparison,
  WARNING_THRESHOLD,
} from "@/services/SymmetryService";
import type { Session, SessionAnalytics } from "@/services/Database";

describe("SymmetryService", () => {
  const defaultAnalytics: SessionAnalytics = {
    avgActivation: 0.4,
    maxActivation: 0.8,
    deficitPercentage: 10,
    fatigueScore: 4,
    romDegrees: 90,
    exerciseQuality: 0.8,
    completionRate: 80,
    intensityScore: 7,
    normalizedChannelMeans: [80, 78, 65, 42],
  };
  const buildAnalytics = (
    overrides: Partial<SessionAnalytics> = {},
  ): SessionAnalytics => ({
    ...defaultAnalytics,
    ...overrides,
  });

  const createSession = (
    overrides: Omit<Partial<Session>, "analytics"> & {
      analytics?: Partial<SessionAnalytics>;
    } = {},
  ): Session => {
    const { analytics, ...sessionOverrides } = overrides;

    return {
      id: "session-default",
      userId: "athlete@example.com",
      exerciseType: "quad-sets",
      side: "LEFT",
      timestamp: 1000,
      duration: 60,
      avgFlexion: 90,
      exerciseIds: ["quad-sets"],
      synced: false,
      updatedAt: Date.now(),
      ...sessionOverrides,
      analytics: buildAnalytics(analytics),
    };
  };

  it("computes the true healthy-vs-injured channel deficits", () => {
    const result = buildBilateralComparison(
      createSession({
        id: "healthy",
        side: "RIGHT",
        analytics: { normalizedChannelMeans: [88, 84, 70, 40] },
      }),
      createSession({
        id: "injured",
        side: "LEFT",
        analytics: { normalizedChannelMeans: [72, 68, 52, 54] },
      }),
    );

    expect(result.symmetryScore).toBe(88);
    expect(result.channels.map((channel) => channel.deficit)).toEqual([
      16, 16, 18, 0,
    ]);
  });

  it("flags muscle groups whose bilateral deficit exceeds the warning threshold", () => {
    const result = buildBilateralComparison(
      createSession({
        id: "healthy",
        side: "RIGHT",
        analytics: { normalizedChannelMeans: [100, 92, 88, 48] },
      }),
      createSession({
        id: "injured",
        side: "LEFT",
        analytics: { normalizedChannelMeans: [62, 55, 58, 66] },
      }),
    );

    expect(WARNING_THRESHOLD).toBe(30);
    expect(result.channels.map((channel) => channel.deficit)).toEqual([
      38, 37, 30, 0,
    ]);
    expect(result.channels.map((channel) => channel.hasWarning)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(result.hasAnyWarning).toBe(true);
  });

  it("finds the latest comparable healthy/injured pair for the same exercise", () => {
    const result = findLatestBilateralComparison(
      [
        createSession({
          id: "old-healthy",
          side: "RIGHT",
          timestamp: 1000,
          analytics: { normalizedChannelMeans: [78, 74, 60, 39] },
        }),
        createSession({
          id: "latest-healthy",
          side: "RIGHT",
          timestamp: 3000,
          analytics: { normalizedChannelMeans: [88, 84, 72, 41] },
        }),
        createSession({
          id: "latest-injured",
          side: "LEFT",
          timestamp: 4000,
          analytics: { normalizedChannelMeans: [70, 64, 55, 49] },
        }),
      ],
      "LEFT",
    );

    expect(result).toEqual(
      expect.objectContaining({
        healthySessionId: "latest-healthy",
        injuredSessionId: "latest-injured",
        vmoVlBalance: 6,
        hamstringGuarding: 8,
      }),
    );
  });
});
