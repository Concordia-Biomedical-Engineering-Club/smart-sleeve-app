import { Session, insertSession, clearAllSessions } from "./Database";

const EXERCISES = ["quad_sets", "heel_slides", "straight_leg_raises"];

/**
 * Generates approximately 45 days of synthetic data representing a recovery arc.
 * ROM starts at ~60° and ends at ~115°.
 * Quality starts at ~45% and ends at ~92%.
 */
export async function generateDemoData(userId: string, options: { clearExisting: boolean } = { clearExisting: true }) {
  if (options.clearExisting) {
    await clearAllSessions();
  }

  const sessions: Session[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  // Starting 45 days ago
  for (let d = 45; d >= 0; d--) {
    const timestamp = now - (d * dayMs);
    const progressFactor = (45 - d) / 45; // 0.0 to 1.0

    // 1 to 2 sessions per day
    const numSessions = Math.random() > 0.3 ? 2 : 1;
    
    for (let s = 0; s < numSessions; s++) {
      const exerciseType = EXERCISES[Math.floor(Math.random() * EXERCISES.length)];
      
      // Calculate trending metrics
      const romBase = 60 + (progressFactor * 55); // 60 -> 115
      const romVariation = (Math.random() * 10) - 5;
      const romDegrees = Math.min(130, Math.max(30, romBase + romVariation));

      const qualityBase = 0.45 + (progressFactor * 0.45); // 0.45 -> 0.90
      const qualityVariation = (Math.random() * 0.1) - 0.05;
      const exerciseQuality = Math.min(1.0, Math.max(0.1, qualityBase + qualityVariation));

      const activationBase = 35 + (progressFactor * 40); // 35 -> 75
      const avgActivation = activationBase + (Math.random() * 10);

      // Simulate Muscle Balance (VMO vs VL)
      // Early on: VMO is weak (~40% of VL), VL is dominant
      // Late: VMO catches up (~95% of VL)
      const vmoRatio = 0.4 + (progressFactor * 0.55);
      const vlValue = avgActivation;
      const vmoValue = vlValue * vmoRatio;
      const stValue = avgActivation * 0.7;
      const bfValue = avgActivation * 0.65;
      
      const normalizedChannelMeans = [
        Math.round(vmoValue * 10) / 10,
        Math.round(vlValue * 10) / 10,
        Math.round(stValue * 10) / 10,
        Math.round(bfValue * 10) / 10,
      ];

      const sessionId = `demo_${timestamp}_${s}`;
      
      const session: Session = {
        id: sessionId,
        userId: userId,
        exerciseType: exerciseType,
        side: "LEFT", // Assuming left knee injury for demo consistency
        timestamp: timestamp + (s * 3600000 * 4), // Space them out
        duration: 180 + Math.floor(Math.random() * 120),
        avgFlexion: romDegrees * 0.8,
        exerciseIds: [exerciseType],
        synced: false, // Mark as unsynced so the SyncService can upload them to cloud
        updatedAt: timestamp,
        analytics: {
          avgActivation,
          maxActivation: avgActivation * 1.8,
          deficitPercentage: 25 - (progressFactor * 15), // Deficit goes down
          fatigueScore: 0.6 - (progressFactor * 0.4), // Fatigue management improves
          romDegrees,
          exerciseQuality,
          completionRate: 80 + (progressFactor * 20), // Completes more reps over time
          intensityScore: 5 + (progressFactor * 4),
          normalizedChannelMeans: normalizedChannelMeans,
        }
      };

      await insertSession(session);
      sessions.push(session);
    }
  }

  return sessions.length;
}
