import {
  alignKneeAnglesToEMGFrames,
  saveSession,
} from "@/services/SessionService";
import { EMGData, IMUData } from "@/services/SleeveConnector/ISleeveConnector";
import {
  bulkInsertEMGSamples,
  bulkInsertEMGSamplesWithDatabase,
  getDatabase,
  insertSession,
  insertUser,
} from "@/services/Database";

jest.mock("@/services/Database", () => ({
  insertSession: jest.fn(),
  bulkInsertEMGSamples: jest.fn(),
  bulkInsertEMGSamplesWithDatabase: jest.fn(),
  insertUser: jest.fn(),
  getDatabase: jest.fn(),
}));

const mockedInsertSession = insertSession as jest.MockedFunction<
  typeof insertSession
>;
const mockedBulkInsertEMGSamples = bulkInsertEMGSamples as jest.MockedFunction<
  typeof bulkInsertEMGSamples
>;
const mockedBulkInsertEMGSamplesWithDatabase =
  bulkInsertEMGSamplesWithDatabase as jest.MockedFunction<
    typeof bulkInsertEMGSamplesWithDatabase
  >;
const mockedInsertUser = insertUser as jest.MockedFunction<typeof insertUser>;
const mockedGetDatabase = getDatabase as jest.MockedFunction<
  typeof getDatabase
>;

describe("SessionService", () => {
  const calibration = {
    baseline: [0, 0, 0, 0],
    mvc: [0.8, 0.2, 1, 1],
    calibratedAt: Date.now(),
  };

  const mockDb = {
    getFirstAsync: jest.fn().mockResolvedValue({ id: "session_1000_fixed" }),
    withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => {
      await callback();
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getFirstAsync.mockResolvedValue({ id: "session_1000_fixed" });
    mockDb.withTransactionAsync.mockImplementation(
      async (callback: () => Promise<void>) => {
        await callback();
      },
    );
    mockedGetDatabase.mockResolvedValue(mockDb);
    jest.spyOn(Math, "random").mockReturnValue(0.424242);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("alignKneeAnglesToEMGFrames matches each EMG frame to the nearest IMU timestamp", () => {
    const emgFrames: EMGData[] = [
      {
        header: 0xaa,
        timestamp: 1000,
        channels: [0.2, 0.4, 0.1, 0.3],
        checksum: 0,
      },
      {
        header: 0xaa,
        timestamp: 1030,
        channels: [0.3, 0.5, 0.2, 0.1],
        checksum: 0,
      },
      {
        header: 0xaa,
        timestamp: 1085,
        channels: [0.6, 0.4, 0.3, 0.2],
        checksum: 0,
      },
    ];
    const imuFrames: IMUData[] = [
      { header: 0xbb, timestamp: 995, roll: 12, pitch: 0, yaw: 0, checksum: 0 },
      {
        header: 0xbb,
        timestamp: 1045,
        roll: 20,
        pitch: 0,
        yaw: 0,
        checksum: 0,
      },
      {
        header: 0xbb,
        timestamp: 1090,
        roll: 35,
        pitch: 0,
        yaw: 0,
        checksum: 0,
      },
    ];

    expect(alignKneeAnglesToEMGFrames(emgFrames, imuFrames)).toEqual([
      12, 20, 35,
    ]);
  });

  test("saveSession uses timestamp-aligned knee angles and derives ROM from IMU roll values", async () => {
    const emgFrames: EMGData[] = [
      {
        header: 0xaa,
        timestamp: 1000,
        channels: [0.2, 0.4, 0.1, 0.3],
        checksum: 0,
      },
      {
        header: 0xaa,
        timestamp: 1030,
        channels: [0.3, 0.5, 0.2, 0.1],
        checksum: 0,
      },
      {
        header: 0xaa,
        timestamp: 1085,
        channels: [0.6, 0.4, 0.3, 0.2],
        checksum: 0,
      },
    ];
    const imuFrames: IMUData[] = [
      { header: 0xbb, timestamp: 995, roll: 12, pitch: 0, yaw: 0, checksum: 0 },
      {
        header: 0xbb,
        timestamp: 1045,
        roll: 20,
        pitch: 0,
        yaw: 0,
        checksum: 0,
      },
      {
        header: 0xbb,
        timestamp: 1090,
        roll: 35,
        pitch: 0,
        yaw: 0,
        checksum: 0,
      },
    ];

    await saveSession({
      userId: "patient@example.com",
      exerciseId: "quad-sets",
      exerciseName: "Quadriceps Sets",
      side: "LEFT",
      startTime: 1000,
      endTime: 1150,
      emgBuffer: emgFrames,
      kneeAngleBuffer: imuFrames,
      completedReps: 3,
      targetReps: 6,
    });

    expect(mockedInsertUser).toHaveBeenCalled();
    expect(mockedInsertSession).toHaveBeenCalledWith(
      expect.objectContaining({
        completedReps: 3,
        targetReps: 6,
        analytics: expect.objectContaining({
          completionRate: 50,
          deficitPercentage: 26.1,
          intensityScore: expect.any(Number),
          romDegrees: 23,
        }),
      }),
      mockDb,
    );
    expect(mockDb.withTransactionAsync).toHaveBeenCalled();
    expect(mockedBulkInsertEMGSamplesWithDatabase).toHaveBeenCalledWith(
      [
        expect.objectContaining({ timestamp: 1000, kneeAngle: 12 }),
        expect.objectContaining({ timestamp: 1030, kneeAngle: 20 }),
        expect.objectContaining({ timestamp: 1085, kneeAngle: 35 }),
      ],
      mockDb,
    );
  });

  test("saveSession computes deficitPercentage from normalized channels when calibration is provided", async () => {
    const emgFrames: EMGData[] = [
      {
        header: 0xaa,
        timestamp: 1000,
        channels: [0.8, 0.2, 0.1, 0.3],
        checksum: 0,
      },
      {
        header: 0xaa,
        timestamp: 1030,
        channels: [0.4, 0.1, 0.2, 0.1],
        checksum: 0,
      },
    ];

    await saveSession({
      userId: "patient@example.com",
      exerciseId: "quad-sets",
      exerciseName: "Quadriceps Sets",
      side: "LEFT",
      startTime: 1000,
      endTime: 1100,
      emgBuffer: emgFrames,
      kneeAngleBuffer: [],
      calibration,
    });

    expect(mockedInsertSession).toHaveBeenCalledWith(
      expect.objectContaining({
        analytics: expect.objectContaining({
          deficitPercentage: 0,
        }),
      }),
      mockDb,
    );
  });
});
