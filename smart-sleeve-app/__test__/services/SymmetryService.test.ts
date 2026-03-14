import {
  buildBilateralComparison,
  findLatestBilateralComparison,
  computeHistoricalSymmetryTrends,
  BILATERAL_PAIRING_WINDOW_MS,
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

describe("computeHistoricalSymmetryTrends", () => {
  const buildAnalytics = (
    normalizedChannelMeans: number[],
  ): SessionAnalytics => ({
    avgActivation: 0.4,
    maxActivation: 0.8,
    deficitPercentage: 10,
    fatigueScore: 4,
    romDegrees: 90,
    exerciseQuality: 0.8,
    completionRate: 80,
    intensityScore: 7,
    normalizedChannelMeans,
  });

  const createSession = (
    id: string,
    side: "LEFT" | "RIGHT",
    timestamp: number,
    channels: number[] = [80, 78, 65, 42],
    exerciseType = "quad-sets",
  ): Session => ({
    id,
    userId: "user-1",
    exerciseType,
    side,
    timestamp,
    duration: 60,
    avgFlexion: 90,
    exerciseIds: [exerciseType],
    synced: false,
    updatedAt: timestamp,
    analytics: buildAnalytics(channels),
  });

  const DAY = 24 * 60 * 60 * 1000;

  it("pairs sessions within the 24h window and returns sorted trend points", () => {
    const t0 = 1_000_000_000_000;
    const sessions = [
      createSession("inj-1", "LEFT", t0, [70, 68, 52, 40]),
      createSession("heal-1", "RIGHT", t0 + 600_000, [88, 84, 70, 40]), // 10 min later
      createSession("inj-2", "LEFT", t0 + DAY, [75, 72, 56, 42]),
      createSession("heal-2", "RIGHT", t0 + DAY + 900_000, [90, 86, 72, 41]), // 15 min later
    ];

    const points = computeHistoricalSymmetryTrends(sessions, "LEFT");

    expect(points).toHaveLength(2);
    expect(points[0].injuredSessionId).toBe("inj-1");
    expect(points[0].healthySessionId).toBe("heal-1");
    expect(points[1].injuredSessionId).toBe("inj-2");
    expect(points[1].healthySessionId).toBe("heal-2");
    // Points should be sorted oldest → newest
    expect(points[0].timestamp).toBeLessThan(points[1].timestamp);
    // Symmetry scores should be non-negative and ≤ 100
    points.forEach((p) => {
      expect(p.symmetryScore).toBeGreaterThanOrEqual(0);
      expect(p.symmetryScore).toBeLessThanOrEqual(100);
      expect(p.averageDeficit).toBeGreaterThanOrEqual(0);
    });
  });

  it("does not pair sessions outside the 24h window", () => {
    const t0 = 1_000_000_000_000;
    const sessions = [
      createSession("inj-1", "LEFT", t0, [70, 68, 52, 40]),
      // healthy session is 25h later — outside window
      createSession("heal-1", "RIGHT", t0 + DAY + 3_600_000, [88, 84, 70, 40]),
    ];

    const points = computeHistoricalSymmetryTrends(sessions, "LEFT");
    expect(points).toHaveLength(0);
  });

  it("does not reuse the same healthy session for multiple injured sessions", () => {
    const t0 = 1_000_000_000_000;
    const sessions = [
      createSession("inj-1", "LEFT", t0, [70, 68, 52, 40]),
      createSession("inj-2", "LEFT", t0 + 3_600_000, [72, 69, 54, 41]), // 1h later
      // Only one healthy session — should be claimed by inj-1 (closest)
      createSession("heal-1", "RIGHT", t0 + 600_000, [88, 84, 70, 40]),
    ];

    const points = computeHistoricalSymmetryTrends(sessions, "LEFT");
    expect(points).toHaveLength(1);
    expect(points[0].healthySessionId).toBe("heal-1");
    expect(points[0].injuredSessionId).toBe("inj-1");
  });

  it("picks the nearest healthy session when multiple are within the window", () => {
    const t0 = 1_000_000_000_000;
    const sessions = [
      createSession("inj-1", "LEFT", t0, [70, 68, 52, 40]),
      createSession("heal-far", "RIGHT", t0 + 20 * 3_600_000, [86, 82, 68, 39]), // 20h away
      createSession("heal-near", "RIGHT", t0 + 3_600_000, [88, 84, 70, 40]), // 1h away
    ];

    const points = computeHistoricalSymmetryTrends(sessions, "LEFT");
    expect(points).toHaveLength(1);
    expect(points[0].healthySessionId).toBe("heal-near");
  });

  it("groups pairs by exercise type and handles missing channels gracefully", () => {
    const t0 = 1_000_000_000_000;
    const sessions = [
      createSession("inj-qs", "LEFT", t0, [70, 68, 52, 40], "quad-sets"),
      createSession(
        "heal-qs",
        "RIGHT",
        t0 + 600_000,
        [88, 84, 70, 40],
        "quad-sets",
      ),
      createSession(
        "inj-hs",
        "LEFT",
        t0 + DAY,
        [65, 63, 50, 38],
        "heel-slides",
      ),
      createSession(
        "heal-hs",
        "RIGHT",
        t0 + DAY + 600_000,
        [85, 82, 68, 39],
        "heel-slides",
      ),
      // Session with no channel data — should be skipped
      {
        ...createSession("inj-bad", "LEFT", t0 + 2 * DAY, [], "quad-sets"),
        analytics: {
          ...createSession("inj-bad", "LEFT", t0).analytics,
          normalizedChannelMeans: [],
        },
      },
    ];

    const points = computeHistoricalSymmetryTrends(sessions, "LEFT");
    expect(points).toHaveLength(2);
    const exerciseTypes = points.map((p) => p.exerciseType);
    expect(exerciseTypes).toContain("quad-sets");
    expect(exerciseTypes).toContain("heel-slides");
  });

  it("returns empty array when there are no sessions", () => {
    expect(computeHistoricalSymmetryTrends([], "LEFT")).toEqual([]);
  });

  it("returns empty array when all sessions are on the same side", () => {
    const t0 = 1_000_000_000_000;
    const sessions = [
      createSession("inj-1", "LEFT", t0, [70, 68, 52, 40]),
      createSession("inj-2", "LEFT", t0 + 600_000, [72, 70, 54, 42]),
    ];
    expect(computeHistoricalSymmetryTrends(sessions, "LEFT")).toEqual([]);
  });

  it("exposes the correct BILATERAL_PAIRING_WINDOW_MS constant", () => {
    expect(BILATERAL_PAIRING_WINDOW_MS).toBe(DAY);
  });
});
