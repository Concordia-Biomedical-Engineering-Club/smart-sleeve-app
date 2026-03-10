/**
 * SessionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Issue #7 — Save Session Data for Offline Review
 *
 * Handles the flush of the recording buffer to SQLite when endSession fires.
 * Called from the dashboard after the endSession Redux action is dispatched.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EMGData } from '@/services/SleeveConnector/ISleeveConnector';
import {
  insertSession,
  bulkInsertEMGSamples,
  Session,
  EMGSample,
} from '@/services/Database';

export interface SaveSessionParams {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  side: 'LEFT' | 'RIGHT';
  startTime: number;
  endTime: number;
  emgBuffer: EMGData[];
  kneeAngleBuffer: number[];
}

export interface SaveSessionResult {
  sessionId: string;
  sampleCount: number;
  durationMs: number;
}

/**
 * Persists a completed workout session and all its EMG samples to SQLite.
 *
 * Steps:
 *  1. Build Session metadata row
 *  2. Insert session row
 *  3. Map EMGData[] + kneeAngleBuffer[] → EMGSample[]
 *  4. Bulk insert all samples in a single transaction
 *
 * @returns sessionId, sample count, and total save duration in ms
 */
export async function saveSession(params: SaveSessionParams): Promise<SaveSessionResult> {
  const {
    userId, exerciseId, exerciseName, side,
    startTime, endTime, emgBuffer, kneeAngleBuffer,
  } = params;

  const sessionId = `session_${startTime}_${Math.random().toString(36).slice(2, 7)}`;
  const duration = Math.round((endTime - startTime) / 1000);

  // ── Compute analytics from buffer ──────────────────────────────────────────
  const rmsValues = emgBuffer.map(frame => frame.channels.slice(0, 4));
  const avgActivation = computeMean(rmsValues.map(ch => average(ch)));
  const maxActivation = Math.max(...rmsValues.map(ch => Math.max(...ch)), 0);
  const avgFlexion = kneeAngleBuffer.length > 0 ? average(kneeAngleBuffer) : 0;

  // ── Build session row ──────────────────────────────────────────────────────
  const session: Session = {
    id: sessionId,
    userId,
    exerciseType: exerciseName,
    side,
    timestamp: startTime,
    duration,
    avgFlexion,
    exerciseIds: [exerciseId],
    synced: false,
    analytics: {
      avgActivation,
      maxActivation,
      deficitPercentage: 0,   // computed post-hoc when both sides available
      fatigueScore: 0,
      romDegrees: avgFlexion,
      exerciseQuality: 0,
    },
  };

  // ── Build EMG samples ──────────────────────────────────────────────────────
  const samples: EMGSample[] = emgBuffer.map((frame, i) => ({
    sessionId,
    timestamp: frame.timestamp,
    vmo_rms: frame.channels[0] ?? 0,
    vl_rms: frame.channels[1] ?? 0,
    st_rms: frame.channels[2] ?? 0,
    bf_rms: frame.channels[3] ?? 0,
    kneeAngle: kneeAngleBuffer[i] ?? 0,
  }));

  // ── Write to SQLite ────────────────────────────────────────────────────────
  const t0 = Date.now();
  await insertSession(session);
  await bulkInsertEMGSamples(samples);
  const durationMs = Date.now() - t0;

  return { sessionId, sampleCount: samples.length, durationMs };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeMean(arr: number[]): number {
  return average(arr);
}