jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(),
}));

describe("Database service", () => {
  const mockDb = {
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    withTransactionAsync: jest.fn(async (callback: () => Promise<void>) =>
      callback(),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.execAsync.mockReset();
    mockDb.runAsync.mockReset();
    mockDb.getAllAsync.mockReset();
    mockDb.getFirstAsync.mockReset();
    mockDb.withTransactionAsync.mockReset();
    mockDb.withTransactionAsync.mockImplementation(
      async (callback: () => Promise<void>) => callback(),
    );
  });

  function loadDatabase() {
    let database: typeof import("@/services/Database");
    jest.isolateModules(() => {
      const sqlite = require("expo-sqlite");
      sqlite.openDatabaseAsync.mockResolvedValue(mockDb);
      database = require("@/services/Database");
    });
    return database!;
  }

  test("initDatabase adds missing session metric columns for older local databases", async () => {
    mockDb.getAllAsync.mockResolvedValue([{ name: "id" }, { name: "user_id" }]);

    const database = loadDatabase();
    await database.initDatabase();

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS sessions"),
    );
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      "ALTER TABLE sessions ADD COLUMN completed_reps INTEGER NOT NULL DEFAULT 0",
    );
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      "ALTER TABLE sessions ADD COLUMN intensity_score REAL NOT NULL DEFAULT 0",
    );
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      "ALTER TABLE sessions ADD COLUMN normalized_channel_means TEXT NOT NULL DEFAULT '[]'",
    );
  });

  test("fetchSessionsByFilters builds a filtered user-scoped query", async () => {
    mockDb.getAllAsync.mockResolvedValue([]);

    const database = loadDatabase();
    await database.fetchSessionsByFilters({
      userId: "patient@example.com",
      exerciseType: "quad-sets",
      side: "LEFT",
      startTimestamp: 100,
      endTimestamp: 200,
      limit: 5,
    });

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining(
        "user_id = ? AND exercise_type = ? AND side = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT 5",
      ),
      ["patient@example.com", "quad-sets", "LEFT", 100, 200],
    );
  });

  test("insertSession uses the same number of values as declared session columns", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);

    const database = loadDatabase();
    await database.insertSession({
      id: "session-1",
      userId: "patient@example.com",
      exerciseType: "quad-sets",
      side: "LEFT",
      timestamp: 123,
      duration: 45,
      avgFlexion: 90,
      completedReps: 8,
      targetReps: 10,
      exerciseIds: ["quad-sets"],
      synced: false,
      updatedAt: Date.now(),
      analytics: {
        avgActivation: 0.3,
        maxActivation: 0.6,
        deficitPercentage: 12,
        fatigueScore: 4,
        romDegrees: 90,
        exerciseQuality: 0.8,
        completionRate: 80,
        intensityScore: 6,
        normalizedChannelMeans: [75, 70, 65, 60],
      },
    });

    const [sql, values] = mockDb.runAsync.mock.calls[0];
    const placeholderCount = (sql.match(/\?/g) ?? []).length;

    expect(placeholderCount).toBe(21);
    expect(values).toHaveLength(21);
  });

  test("bulkInsertEMGSamples batches many EMG rows into a single multi-value insert", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);

    const database = loadDatabase();
    await database.bulkInsertEMGSamples([
      {
        sessionId: "session-1",
        timestamp: 1,
        vmo_rms: 0.1,
        vl_rms: 0.2,
        st_rms: 0.3,
        bf_rms: 0.4,
        kneeAngle: 10,
      },
      {
        sessionId: "session-1",
        timestamp: 2,
        vmo_rms: 0.2,
        vl_rms: 0.3,
        st_rms: 0.4,
        bf_rms: 0.5,
        kneeAngle: 12,
      },
      {
        sessionId: "session-1",
        timestamp: 3,
        vmo_rms: 0.3,
        vl_rms: 0.4,
        st_rms: 0.5,
        bf_rms: 0.6,
        kneeAngle: 14,
      },
    ]);

    expect(mockDb.withTransactionAsync).toHaveBeenCalled();
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);

    const [sql, params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain(
      "VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)",
    );
    expect(params).toHaveLength(21);
  });

  test("fetchPreviousSessionForExercise queries the nearest earlier matching session", async () => {
    mockDb.getFirstAsync.mockResolvedValue({
      id: "session-1",
      user_id: "patient@example.com",
      exercise_type: "quad-sets",
      side: "LEFT",
      timestamp: 123,
      duration: 50,
      avg_flexion: 90,
      completed_reps: 8,
      target_reps: 10,
      exercise_ids: "[]",
      avg_activation: 0.3,
      max_activation: 0.6,
      deficit_percentage: 12,
      fatigue_score: 4,
      rom_degrees: 90,
      exercise_quality: 0.8,
      completion_rate: 80,
      intensity_score: 6,
      normalized_channel_means: "[75,70,65,60]",
      synced: 0,
    });

    const database = loadDatabase();
    const session = await database.fetchPreviousSessionForExercise({
      userId: "patient@example.com",
      exerciseType: "quad-sets",
      side: "LEFT",
      beforeTimestamp: 500,
    });

    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY timestamp DESC"),
      ["patient@example.com", "quad-sets", "LEFT", 500],
    );
    expect(session).toEqual(
      expect.objectContaining({
        id: "session-1",
        completedReps: 8,
        targetReps: 10,
        analytics: expect.objectContaining({
          completionRate: 80,
          intensityScore: 6,
          normalizedChannelMeans: [75, 70, 65, 60],
        }),
      }),
    );
  });
});
