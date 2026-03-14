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

import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  fetchUnsyncedSessions,
  markSessionSynced,
  upsertSession,
  Session,
} from "./Database";
import { store } from "../store/store";
import { setSyncStatus, setLastSyncedAt } from "../store/userSlice";

/**
 * Uploads all sessions that are currently marked `synced = 0` in local SQLite
 * to the authenticated user's Firestore collection.
 */
export async function uploadUnsyncedSessions(userId: string): Promise<number> {
  const unsynced = await fetchUnsyncedSessions();
  if (unsynced.length === 0) return 0;
  
  let successCount = 0;

  for (const session of unsynced) {
    // Failsafe: only upload sessions belonging to the current user
    if (session.userId !== userId) continue;
    
    try {
      const sessionRef = doc(db, "users", userId, "sessions", session.id);
      
      const payload = {
        id: session.id,
        userId: session.userId,
        exerciseType: session.exerciseType,
        side: session.side,
        timestamp: session.timestamp,
        duration: session.duration,
        avgFlexion: session.avgFlexion,
        completedReps: session.completedReps,
        targetReps: session.targetReps,
        exerciseIds: session.exerciseIds,
        analytics: session.analytics,
        createdAt: Date.now(), // Server-side timestamp alternative
      };

      await setDoc(sessionRef, payload, { merge: true });
      
      // Mark as synced locally so we don't upload again
      await markSessionSynced(session.id);
      successCount++;
    } catch (err) {
      console.error(`[SyncService] Failed to upload session ${session.id}:`, err);
    }
  }

  return successCount;
}

/**
 * Downloads all sessions belonging to the user from Firestore and attempts
 * an upsert into local SQLite. 
 */
export async function downloadSessionsForUser(userId: string): Promise<number> {
  try {
    const sessionsRef = collection(db, "users", userId, "sessions");
    const q = query(sessionsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    let downloadedCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      const session: Session = {
        id: data.id,
        userId: data.userId,
        exerciseType: data.exerciseType,
        side: data.side,
        timestamp: data.timestamp,
        duration: data.duration,
        avgFlexion: data.avgFlexion,
        completedReps: data.completedReps,
        targetReps: data.targetReps,
        exerciseIds: data.exerciseIds,
        analytics: data.analytics,
        synced: true, // Always true since it came from the cloud
      };

      try {
        await upsertSession(session);
        downloadedCount++;
      } catch (err) {
        console.error(`[SyncService] Failed to upsert downloaded session ${session.id}:`, err);
      }
    }

    return downloadedCount;
  } catch (err) {
    console.error(`[SyncService] Failed to download sessions for ${userId}:`, err);
    throw err; // Re-throw to caller to handle state
  }
}

/**
 * Bi-directional sync process. Uploads unsynced first, then downloads back.
 */
export async function syncNow(userId: string | null | undefined): Promise<void> {
  if (!userId) {
    console.warn("[SyncService] Aborting syncNow: No user ID provided.");
    return;
  }
  if (!db) {
    console.warn("[SyncService] Aborting syncNow: Firestore not initialized.");
    return;
  }

  try {
    store.dispatch(setSyncStatus("syncing"));
    console.log(`[SyncService] Starting bi-directional sync for ${userId}...`);

    const uploaded = await uploadUnsyncedSessions(userId);
    console.log(`[SyncService] Uploaded ${uploaded} sessions.`);

    const downloaded = await downloadSessionsForUser(userId);
    console.log(`[SyncService] Downloaded ${downloaded} cloud sessions.`);

    store.dispatch(setSyncStatus("synced"));
    store.dispatch(setLastSyncedAt(Date.now()));
  } catch (error) {
    console.error("[SyncService] Sync failed:", error);
    store.dispatch(setSyncStatus("error"));
  }
}
