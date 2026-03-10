/**
 * Database.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Issue #54 — Setup Local Database (expo-sqlite)
 * Issue #7  — Save Session Data for Offline Review
 *
 * Initialises the local SQLite database and exposes typed CRUD helpers.
 * Schema (Section 8.1 + Issue #7 requirements):
 *   users        — user accounts
 *   sessions     — workout session metadata
 *   emg_samples  — time-series EMG + knee angle (bulk inserted)
 *
 * Storage strategy (Section 8.2):
 *   - Recent 30 days of raw data
 *   - All processed analytics
 *   - Offline queue for Firebase sync
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as SQLite from 'expo-sqlite';

// ── TypeScript interfaces (Section 8.1 + Issue #7) ───────────────────────────

export interface User {
  id: string;
  email: string;
  createdAt: number; // Unix ms
}

export interface SessionAnalytics {
  avgActivation: number;
  maxActivation: number;
  deficitPercentage: number;
  fatigueScore: number;
  romDegrees: number;
  exerciseQuality: number;
}

export interface Session {
  id: string;
  userId: string;
  exerciseType: string;
  side: 'LEFT' | 'RIGHT';
  timestamp: number;      // Unix ms
  duration: number;       // seconds
  avgFlexion: number;
  exerciseIds: string[];  // JSON-serialised in DB
  analytics: SessionAnalytics;
  synced: boolean;        // false = in offline queue
}

/** One time-series sample — maps to emg_samples table */
export interface EMGSample {
  sessionId: string;
  timestamp: number;
  vmo_rms: number;   // CH0
  vl_rms: number;    // CH1
  st_rms: number;    // CH2
  bf_rms: number;    // CH3
  kneeAngle: number;
}

// ── DB singleton ──────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_dbPromise) return _dbPromise;

  _dbPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('smart_sleeve.db');
      _db = db;
      return db;
    } finally {
      _dbPromise = null;
    }
  })();

  return _dbPromise;
}

let _initPromise: Promise<void> | null = null;

/**
 * Must be called once at app startup (e.g. in App.tsx or a top-level provider).
 * Uses CREATE TABLE IF NOT EXISTS so it is safe to call on every launch.
 */
export async function initDatabase(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const db = await getDatabase();

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY NOT NULL,
        email       TEXT NOT NULL UNIQUE,
        created_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id                  TEXT PRIMARY KEY NOT NULL,
        user_id             TEXT NOT NULL,
        exercise_type       TEXT NOT NULL DEFAULT '',
        side                TEXT NOT NULL DEFAULT 'LEFT',
        timestamp           INTEGER NOT NULL,
        duration            INTEGER NOT NULL DEFAULT 0,
        avg_flexion         REAL NOT NULL DEFAULT 0,
        exercise_ids        TEXT NOT NULL DEFAULT '[]',
        avg_activation      REAL NOT NULL DEFAULT 0,
        max_activation      REAL NOT NULL DEFAULT 0,
        deficit_percentage  REAL NOT NULL DEFAULT 0,
        fatigue_score       REAL NOT NULL DEFAULT 0,
        rom_degrees         REAL NOT NULL DEFAULT 0,
        exercise_quality    REAL NOT NULL DEFAULT 0,
        synced              INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS emg_samples (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  TEXT NOT NULL,
        timestamp   INTEGER NOT NULL,
        vmo_rms     REAL NOT NULL DEFAULT 0,
        vl_rms      REAL NOT NULL DEFAULT 0,
        st_rms      REAL NOT NULL DEFAULT 0,
        bf_rms      REAL NOT NULL DEFAULT 0,
        knee_angle  REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
        ON sessions(user_id);

      CREATE INDEX IF NOT EXISTS idx_sessions_timestamp
        ON sessions(timestamp);

      CREATE INDEX IF NOT EXISTS idx_emg_samples_session_id
        ON emg_samples(session_id);
    `);

    console.log('[Database] Schema initialization complete');
  })();

  return _initPromise;
}

// ── User helpers ──────────────────────────────────────────────────────────────

export async function insertUser(user: User): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)`,
    [user.id, user.email, user.createdAt]
  );
}

export async function fetchAllUsers(): Promise<User[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string; email: string; created_at: number;
  }>(`SELECT * FROM users ORDER BY created_at DESC`);
  return rows.map(r => ({ id: r.id, email: r.email, createdAt: r.created_at }));
}

// ── Session helpers ───────────────────────────────────────────────────────────

export async function insertSession(session: Session): Promise<void> {
  const db = await getDatabase();
  const { analytics: a } = session;
  console.log(`[Database] Inserting session row: ${session.id}`);
  await db.runAsync(
    `INSERT INTO sessions (
      id, user_id, exercise_type, side, timestamp, duration, avg_flexion,
      exercise_ids, avg_activation, max_activation, deficit_percentage,
      fatigue_score, rom_degrees, exercise_quality, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id, session.userId, session.exerciseType, session.side,
      session.timestamp, session.duration, session.avgFlexion,
      JSON.stringify(session.exerciseIds),
      a.avgActivation, a.maxActivation, a.deficitPercentage,
      a.fatigueScore, a.romDegrees, a.exerciseQuality,
      session.synced ? 1 : 0,
    ]
  );
  console.log(`[Database] Session row inserted successfully`);
}

export async function fetchSessionsByUser(userId: string): Promise<Session[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sessions WHERE user_id = ? ORDER BY timestamp DESC`,
    [userId]
  );
  return rows.map(rowToSession);
}

export async function fetchAllSessions(): Promise<Session[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sessions ORDER BY timestamp DESC`
  );
  return rows.map(rowToSession);
}

/** Returns sessions not yet synced to Firebase — the offline queue */
export async function fetchUnsyncedSessions(): Promise<Session[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sessions WHERE synced = 0 ORDER BY timestamp ASC`
  );
  return rows.map(rowToSession);
}

export async function markSessionSynced(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE sessions SET synced = 1 WHERE id = ?`, [sessionId]);
}

// ── EMG sample bulk insert ────────────────────────────────────────────────────

/**
 * Bulk-inserts all EMG samples for a session inside a SINGLE transaction
 * for maximum performance on iOS/Android native.
 *
 * Loop is chunked purely to keep individual async frames small on web;
 * all inserts still commit atomically at the end.
 *
 * IMPORTANT: Does NOT use prepareAsync — that API conflicts with
 * withTransactionAsync on the expo-sqlite WASM web backend.
 *
 * @param samples - full recording buffer from deviceSlice
 */
export async function bulkInsertEMGSamples(samples: EMGSample[]): Promise<void> {
  if (samples.length === 0) return;
  const db = await getDatabase();

  const CHUNK_SIZE = 200;
  const chunks = Math.ceil(samples.length / CHUNK_SIZE);
  console.log(`[Database] Bulk inserting ${samples.length} samples (${chunks} chunks)...`);

  await db.withTransactionAsync(async () => {
    for (let j = 0; j < samples.length; j += CHUNK_SIZE) {
      const chunk = samples.slice(j, j + CHUNK_SIZE);
      for (const s of chunk) {
        await db.runAsync(
          `INSERT INTO emg_samples
            (session_id, timestamp, vmo_rms, vl_rms, st_rms, bf_rms, knee_angle)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [s.sessionId, s.timestamp, s.vmo_rms, s.vl_rms, s.st_rms, s.bf_rms, s.kneeAngle]
        );
      }
    }
  });

  console.log(`[Database] Bulk insert complete: ${samples.length} samples`);
}

export async function fetchEMGSamplesBySession(sessionId: string): Promise<EMGSample[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM emg_samples WHERE session_id = ? ORDER BY timestamp ASC`,
    [sessionId]
  );
  return rows.map(r => ({
    sessionId: r.session_id,
    timestamp: r.timestamp,
    vmo_rms: r.vmo_rms,
    vl_rms: r.vl_rms,
    st_rms: r.st_rms,
    bf_rms: r.bf_rms,
    kneeAngle: r.knee_angle,
  }));
}

export async function countEMGSamples(sessionId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM emg_samples WHERE session_id = ?`,
    [sessionId]
  );
  return row?.count ?? 0;
}

// ── Row mapper ────────────────────────────────────────────────────────────────

function rowToSession(row: any): Session {
  return {
    id: row.id,
    userId: row.user_id,
    exerciseType: row.exercise_type ?? '',
    side: row.side ?? 'LEFT',
    timestamp: row.timestamp,
    duration: row.duration,
    avgFlexion: row.avg_flexion ?? 0,
    exerciseIds: JSON.parse(row.exercise_ids ?? '[]'),
    synced: row.synced === 1,
    analytics: {
      avgActivation: row.avg_activation,
      maxActivation: row.max_activation,
      deficitPercentage: row.deficit_percentage,
      fatigueScore: row.fatigue_score,
      romDegrees: row.rom_degrees,
      exerciseQuality: row.exercise_quality,
    },
  };
}