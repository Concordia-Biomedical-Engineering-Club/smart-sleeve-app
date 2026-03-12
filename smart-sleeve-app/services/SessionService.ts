/**
 * SessionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Issue #7 — Save Session Data for Offline Review
 *
 * Handles the flush of the recording buffer to SQLite when endSession fires.
 * Called from the dashboard after the endSession Redux action is dispatched.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EMGData, IMUData } from "@/services/SleeveConnector/ISleeveConnector";
import {
  bulkInsertEMGSamples,
  bulkInsertEMGSamplesWithDatabase,
  insertUser,
  insertSession,
  getDatabase,
  Session,
  EMGSample,
} from "@/services/Database";
import { EXERCISE_LIBRARY } from "@/constants/exercises";
import {
  computeCompletionRate,
  computeDeficitPercentageFromEMGFrames,
  computeIntensityScore,
} from "@/services/ProgressAnalysis";
import { normalize } from "@/services/NormalizationService";
import type { CalibrationCoefficients } from "@/store/userSlice";

export interface SaveSessionParams {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  side: "LEFT" | "RIGHT";
  startTime: number;
  endTime: number;
  emgBuffer: EMGData[];
  kneeAngleBuffer: IMUData[];
  calibration?: CalibrationCoefficients | null;
  completedReps?: number;
  targetReps?: number;
}

export interface SaveSessionResult {
  sessionId: string;
  sampleCount: number;
  durationMs: number;
}

export function alignKneeAnglesToEMGFrames(
  emgBuffer: EMGData[],
  kneeAngleBuffer: Pick<IMUData, "timestamp" | "roll">[],
): number[] {
  if (emgBuffer.length === 0) return [];
  if (kneeAngleBuffer.length === 0) return emgBuffer.map(() => 0);

  const sortedKneeAngles = [...kneeAngleBuffer].sort(
    (left, right) => left.timestamp - right.timestamp,
  );
  let imuIndex = 0;

  return emgBuffer.map((frame) => {
    while (
      imuIndex < sortedKneeAngles.length - 1 &&
      sortedKneeAngles[imuIndex + 1].timestamp <= frame.timestamp
    ) {
      imuIndex += 1;
    }

    const current = sortedKneeAngles[imuIndex];
    const next = sortedKneeAngles[imuIndex + 1];

    if (!next) {
      return current.roll;
    }

    const currentDistance = Math.abs(frame.timestamp - current.timestamp);
    const nextDistance = Math.abs(next.timestamp - frame.timestamp);

    return currentDistance <= nextDistance ? current.roll : next.roll;
  });
}

/**
 * Persists a completed workout session and all its EMG samples to SQLite.
 *
 * Steps:
 *  1. Build Session metadata row
 *  2. Insert session row
 *  3. Map EMGData[] + IMUData[] → EMGSample[] via timestamp alignment
 *  4. Bulk insert all samples in a single transaction
 *
 * @returns sessionId, sample count, and total save duration in ms
 */
export async function saveSession(
  params: SaveSessionParams,
): Promise<SaveSessionResult> {
  const {
    userId,
    exerciseId,
    exerciseName,
    side,
    startTime,
    endTime,
    emgBuffer,
    kneeAngleBuffer,
    calibration,
    completedReps,
    targetReps,
  } = params;

  const sessionId = `session_${startTime}_${Math.random().toString(36).slice(2, 7)}`;
  const duration = Math.round((endTime - startTime) / 1000);
  const exercise = EXERCISE_LIBRARY.find((item) => item.id === exerciseId);
  const recordedAngles = kneeAngleBuffer.map((frame) => frame.roll);
  const alignedKneeAngles = alignKneeAnglesToEMGFrames(
    emgBuffer,
    kneeAngleBuffer,
  );
  const normalizedChannelMeans = computeNormalizedChannelMeans(
    emgBuffer,
    calibration,
  );

  // ── Compute analytics from buffer ──────────────────────────────────────────
  const rmsValues = emgBuffer.map((frame) => frame.channels.slice(0, 4));
  const avgActivation =
    rmsValues.length > 0
      ? rmsValues.reduce((sum, ch) => sum + average(ch), 0) / rmsValues.length
      : 0;
  const maxActivation = Math.max(...rmsValues.map((ch) => Math.max(...ch)), 0);

  const minFlexion =
    recordedAngles.length > 0 ? Math.min(...recordedAngles) : 0;
  const maxFlexion =
    recordedAngles.length > 0 ? Math.max(...recordedAngles) : 0;
  const romDegrees = maxFlexion - minFlexion;
  const deficitPercentage = computeDeficitPercentageFromEMGFrames(
    emgBuffer,
    calibration,
  );
  const resolvedTargetReps = targetReps ?? exercise?.targetReps ?? 0;
  const resolvedCompletedReps =
    resolvedTargetReps > 0
      ? Math.min(
          Math.max(completedReps ?? resolvedTargetReps, 0),
          resolvedTargetReps,
        )
      : Math.max(completedReps ?? 0, 0);

  // Heuristic for quality: Combination of activation level and session duration consistency
  const exerciseQuality = Math.min(
    0.98,
    (avgActivation / 0.5) * 0.7 + (duration > 30 ? 0.3 : 0.1),
  );

  // ── Build session row ──────────────────────────────────────────────────────
  const session: Session = {
    id: sessionId,
    userId,
    exerciseType: exerciseId, // Use the ID for mapping back to names
    side,
    timestamp: startTime,
    duration,
    avgFlexion: maxFlexion, // Storing max as the primary flexion metric
    completedReps: resolvedCompletedReps,
    targetReps: resolvedTargetReps,
    exerciseIds: [exerciseId],
    synced: false,
    analytics: {
      avgActivation,
      maxActivation,
      deficitPercentage,
      fatigueScore: duration > 60 ? 6 : 3,
      romDegrees,
      exerciseQuality: exerciseQuality > 0 ? exerciseQuality : 0.85, // fallback to a good score
      completionRate: 0,
      intensityScore: 0,
      normalizedChannelMeans,
    },
  };

  session.analytics.completionRate = computeCompletionRate(session);
  session.analytics.intensityScore = computeIntensityScore(session);

  // ── Build EMG samples ──────────────────────────────────────────────────────
  const samples: EMGSample[] = emgBuffer.map((frame, i) => ({
    sessionId,
    timestamp: frame.timestamp,
    vmo_rms: frame.channels[0] ?? 0,
    vl_rms: frame.channels[1] ?? 0,
    st_rms: frame.channels[2] ?? 0,
    bf_rms: frame.channels[3] ?? 0,
    kneeAngle: alignedKneeAngles[i] ?? 0,
  }));

  // ── Write to SQLite ────────────────────────────────────────────────────────
  const t0 = Date.now();
  console.log(
    `[SessionService] Preparing to save session ${sessionId} for user ${userId}...`,
  );
  const db = await getDatabase();

  try {
    await db.withTransactionAsync(async () => {
      await insertUser(
        {
          id: userId,
          email: userId,
          createdAt: Date.now(),
        },
        db,
      );

      console.log(
        `[SessionService] Writing ${samples.length} samples to SQLite...`,
      );
      await insertSession(session, db);

      const verify = await db.getFirstAsync(
        "SELECT id FROM sessions WHERE id = ?",
        [String(sessionId)],
      );
      if (!verify) {
        throw new Error(
          `Session ${sessionId} failed to persist in metadata table.`,
        );
      }

      await bulkInsertEMGSamplesWithDatabase(samples, db);
    });

    const durationMs = Date.now() - t0;
    console.log(`[SessionService] ✅ Save complete! Time: ${durationMs}ms`);
    return { sessionId, sampleCount: samples.length, durationMs };
  } catch (err) {
    console.error(`[SessionService] ❌ Save FAILED:`, err);
    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeNormalizedChannelMeans(
  emgBuffer: EMGData[],
  calibration?: CalibrationCoefficients | null,
): number[] | null {
  if (
    !calibration ||
    calibration.calibratedAt === null ||
    emgBuffer.length === 0
  ) {
    return null;
  }

  const channelTotals = [0, 0, 0, 0];

  for (const frame of emgBuffer) {
    const normalizedChannels = normalize(frame.channels, calibration);
    for (let channelIndex = 0; channelIndex < 4; channelIndex += 1) {
      channelTotals[channelIndex] += normalizedChannels[channelIndex] ?? 0;
    }
  }

  return channelTotals.map(
    (total) => Math.round((total / emgBuffer.length) * 10) / 10,
  );
}
