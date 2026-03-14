/**
 * SyncService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Issue #95 — Cloud Backup & Cross-Device Session Sync
 *
 * Implements bidirectional sync mapping local SQLite sessions to a Firestore
 * backend. It operates purely on session metadata + analytics (does NOT sync
 * high-volume raw EMG data).
 *
 * Firestore Document Structure (`users/{userId}/sessions/{sessionId}`):
 * {
 *   id: string;
 *   userId: string;
 *   exerciseType: string;
 *   side: 'LEFT' | 'RIGHT';
 *   timestamp: number;
 *   duration: number;
 *   avgFlexion: number;
 *   completedReps: number;
 *   targetReps: number;
 *   exerciseIds: string[];
 *   analytics: { ... }
 *   createdAt: number;
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { doc, setDoc, getDocs, collection, query } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  fetchUnsyncedSessions,
  markSessionSynced,
  upsertSession,
  initDatabase,
  Session,
} from "./Database";
import { store } from "../store/store";
import { setSyncStatus, setLastSyncedAt } from "../store/userSlice";

/**
 * Uploads all sessions that are currently marked `synced = 0` in local SQLite
 * to the authenticated user's Firestore collection.
 * @param uid The canonical Firebase User ID (not email)
 */
export async function uploadUnsyncedSessions(
  uid: string,
  legacyEmail?: string | null,
): Promise<number> {
  const unsynced = await fetchUnsyncedSessions();
  if (unsynced.length === 0) return 0;

  const allowedUserIds = new Set(
    [uid, legacyEmail].filter(Boolean) as string[],
  );
  let successCount = 0;

  for (const session of unsynced) {
    if (!allowedUserIds.has(session.userId)) {
      console.log(
        `[SyncService] Skipping unsynced session ${session.id} owned by ${session.userId}`,
      );
      continue;
    }

    try {
      const sessionRef = doc(db, "users", uid, "sessions", session.id);

      const payload = {
        id: session.id,
        userId: uid, // Update userId to explicitly use the canonical UID
        exerciseType: session.exerciseType,
        side: session.side,
        timestamp: session.timestamp,
        duration: session.duration,
        avgFlexion: session.avgFlexion,
        completedReps: session.completedReps,
        targetReps: session.targetReps,
        exerciseIds: session.exerciseIds,
        analytics: session.analytics,
        updatedAt: session.updatedAt ?? session.timestamp,
        createdAt: session.timestamp ?? Date.now(), // Server-side timestamp alternative
      };

      await setDoc(sessionRef, payload, { merge: true });

      // Mark as synced locally so we don't upload again
      await markSessionSynced(session.id);
      successCount++;
    } catch (err) {
      console.error(
        `[SyncService] Failed to upload session ${session.id}:`,
        err,
      );
    }
  }

  return successCount;
}

/**
 * Recalculates aggregate recovery metrics (Best ROM, Avg Symmetry) from the
 * user's session history and updates the top-level Firestore User document.
 * This powers the high-level triage view in the Clinician Portal.
 *
 * Also writes profile fields (displayName, email, injuredSide, therapyGoal) so
 * the clinician portal can display real patient data — these fields only exist
 * in Redux/AsyncStorage otherwise and would never appear in Firestore.
 */
export async function updateUserAggregates(uid: string): Promise<void> {
  try {
    const { fetchSessionsByUser } = await import("./Database");
    const allSessions = await fetchSessionsByUser(uid);

    // Pull profile fields from Redux store for the Firestore user document.
    const state = store.getState();
    const userState = state.user;

    const profileFields = {
      uid,
      email: userState.email ?? null,
      displayName: userState.email?.split("@")[0] ?? "Athlete",
      injuredSide: userState.injuredSide ?? null,
      therapyGoal: userState.therapyGoal ?? null,
      lastSyncedAt: Date.now(),
    };

    if (allSessions.length === 0) {
      // Still write the profile so the patient appears in the portal directory
      // even before they have completed sessions.
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, profileFields, { merge: true });
      console.log(
        `[SyncService] Wrote profile stub for UID ${uid} (no sessions yet).`,
      );
      return;
    }

    // Take the 5 most recent sessions for rolling averages
    const recent = allSessions.slice(0, 5);
    const recentROM = Math.max(...recent.map((s) => s.analytics.romDegrees));
    const avgSymmetry = Math.round(
      recent.reduce(
        (sum, s) => sum + (100 - s.analytics.deficitPercentage),
        0,
      ) / recent.length,
    );

    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        ...profileFields,
        recentROM,
        recentSymmetry: avgSymmetry,
        complianceScore: Math.round((recent.length / 5) * 100), // Heuristic: sessions per rolling window
      },
      { merge: true },
    );

    console.log(
      `[SyncService] Updated user aggregates: ROM=${recentROM}, Symmetry=${avgSymmetry}`,
    );
  } catch (err) {
    console.error("[SyncService] Failed to update user aggregates:", err);
  }
}

/**
 * Downloads all sessions belonging to the user from Firestore and attempts
 * an upsert into local SQLite.
 *
 * Safe Identity Migration: If the canonical UID path is empty, it makes a one-time
 * read attempt from the legacy `email` path. If records exist, they are restored
 * locally and rewritten to the new UID path automatically.
 */
export async function downloadSessionsForUser(
  uid: string,
  legacyEmail?: string | null,
): Promise<number> {
  try {
    let snapshot = await getDocs(
      query(collection(db, "users", uid, "sessions")),
    );
    let isLegacyBackfill = false;

    // Legacy Migration Path
    if (snapshot.empty && legacyEmail) {
      const legacySnapshot = await getDocs(
        query(collection(db, "users", legacyEmail, "sessions")),
      );
      if (!legacySnapshot.empty) {
        console.log(
          `[SyncService] Migration: Found ${legacySnapshot.size} sessions under legacy email. Backfilling to UID.`,
        );
        snapshot = legacySnapshot;
        isLegacyBackfill = true;
      }
    }

    let downloadedCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      const session: Session = {
        id: data.id,
        userId: isLegacyBackfill ? uid : data.userId, // Patch User ID during backfill
        exerciseType: data.exerciseType,
        side: data.side,
        timestamp: data.timestamp,
        duration: data.duration,
        avgFlexion: data.avgFlexion,
        completedReps: data.completedReps,
        targetReps: data.targetReps,
        exerciseIds: data.exerciseIds,
        analytics: data.analytics,
        updatedAt: data.updatedAt ?? data.timestamp, // Fallback for old records
        synced: true, // Always true since it came from the cloud
      };

      try {
        await upsertSession(session);
        downloadedCount++;

        // If migrating from legacy, mirror the write back to the correct UID path immediately
        if (isLegacyBackfill) {
          const newRef = doc(db, "users", uid, "sessions", session.id);
          await setDoc(newRef, { ...data, userId: uid }, { merge: true });
        }
      } catch (err) {
        console.error(
          `[SyncService] Failed to upsert downloaded session ${session.id}:`,
          err,
        );
      }
    }

    return downloadedCount;
  } catch (err) {
    console.error(`[SyncService] Failed to download sessions for ${uid}:`, err);
    throw err; // Re-throw to caller to handle state
  }
}

let _isSyncing = false;

/**
 * Bi-directional sync process. Uploads unsynced first, then downloads back.
 * Features an in-flight re-entrancy lock so concurrent triggers do not race.
 */
export async function syncNow(
  uid: string | null | undefined,
  legacyEmail?: string | null,
): Promise<void> {
  if (!uid) {
    console.warn("[SyncService] Aborting syncNow: No UID provided.");
    return;
  }
  if (!db) {
    console.warn("[SyncService] Aborting syncNow: Firestore not initialized.");
    return;
  }
  if (_isSyncing) {
    console.log(
      "[SyncService] Sync already in progress, ignoring duplicate call.",
    );
    return;
  }

  _isSyncing = true;

  try {
    store.dispatch(setSyncStatus("syncing"));
    console.log(`[SyncService] Starting bi-directional sync for UID ${uid}...`);

    // Defensive DB initialization guarantee (in case triggered early)
    await initDatabase();

    const uploaded = await uploadUnsyncedSessions(uid, legacyEmail);
    console.log(`[SyncService] Uploaded ${uploaded} sessions.`);

    const downloaded = await downloadSessionsForUser(uid, legacyEmail);
    console.log(`[SyncService] Downloaded ${downloaded} cloud sessions.`);

    // Refresh institutional summary fields for the clinician portal
    await updateUserAggregates(uid);

    store.dispatch(setSyncStatus("synced"));
    store.dispatch(setLastSyncedAt(Date.now()));
  } catch (error) {
    console.error("[SyncService] Sync failed:", error);
    store.dispatch(setSyncStatus("error"));
  } finally {
    _isSyncing = false;
  }
}
