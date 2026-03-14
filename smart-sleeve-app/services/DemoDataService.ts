import { Session, insertSession, clearAllSessions } from "./Database";
import type { InjuredSide } from "@/store/userSlice";

const EXERCISES = ["quad-sets", "heel-slides", "straight-leg-raises"];

/**
 * Generates approximately 45 days of synthetic data representing a recovery arc.
 * ROM starts at ~60° and ends at ~115°.
 * Quality starts at ~45% and ends at ~92%.
 */
export async function generateDemoData(
  userId: string,
  injuredSide: InjuredSide = "LEFT",
  options: { clearExisting: boolean } = { clearExisting: true },
) {
  if (options.clearExisting) {
    await clearAllSessions();
  }

  const sessions: Session[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Starting 45 days ago
  for (let d = 45; d >= 0; d--) {
    const timestamp = now - d * dayMs;
    const progressFactor = (45 - d) / 45; // 0.0 to 1.0

    // 1 to 2 sessions per day
    const numSessions = Math.random() > 0.3 ? 2 : 1;

    for (let s = 0; s < numSessions; s++) {
      const exerciseType =
        EXERCISES[Math.floor(Math.random() * EXERCISES.length)];
      const healthySide = injuredSide === "LEFT" ? "RIGHT" : "LEFT";

      // Calculate trending metrics for INJURED side
      const romBase = 60 + progressFactor * 55; // 60 -> 115
      const romVariation = Math.random() * 10 - 5;
      const romDegrees = Math.min(130, Math.max(30, romBase + romVariation));

      const qualityBase = 0.45 + progressFactor * 0.45; // 0.45 -> 0.90
      const qualityVariation = Math.random() * 0.1 - 0.05;
      const exerciseQuality = Math.min(
        1.0,
        Math.max(0.1, qualityBase + qualityVariation),
      );

      const activationBase = 35 + progressFactor * 40; // 35 -> 75
      const avgActivation = activationBase + Math.random() * 10;

      // Simulate Muscle Balance (VMO vs VL) on INJURED side
      const vmoRatio = 0.4 + progressFactor * 0.55;
      const vlValue = avgActivation;
      const vmoValue = vlValue * vmoRatio;

      const injuredChannels = [
        Math.round(vmoValue * 10) / 10,
        Math.round(vlValue * 10) / 10,
        Math.round(avgActivation * 0.7 * 10) / 10,
        Math.round(avgActivation * 0.65 * 10) / 10,
      ];

      // CREATE INJURED SESSION
      const injuredSession: Session = {
        id: `demo_inj_${timestamp}_${s}`,
        userId: userId,
        exerciseType: exerciseType,
        side: injuredSide,
        timestamp: timestamp + s * 3600000 * 4,
        duration: 180 + Math.floor(Math.random() * 120),
        avgFlexion: romDegrees * 0.8,
        exerciseIds: [exerciseType],
        synced: false,
        updatedAt: timestamp,
        analytics: {
          avgActivation,
          maxActivation: avgActivation * 1.8,
          deficitPercentage: 25 - progressFactor * 15,
          fatigueScore: 0.6 - progressFactor * 0.4,
          romDegrees,
          exerciseQuality,
          completionRate: 80 + progressFactor * 20,
          intensityScore: 5 + progressFactor * 4,
          normalizedChannelMeans: injuredChannels,
        },
      };

      await insertSession(injuredSession);
      sessions.push(injuredSession);

      // CREATE MATCHING HEALTHY SESSION (Baseline)
      // Healthy side has better ROM (120-130) and perfect quality (0.95+)
      const healthyActivation = 85 + Math.random() * 10;
      const healthyChannels = [
        Math.round(healthyActivation * 0.95 * 10) / 10, // VMO
        Math.round(healthyActivation * 10) / 10, // VL
        Math.round(healthyActivation * 0.8 * 10) / 10,
        Math.round(healthyActivation * 0.75 * 10) / 10,
      ];

      const healthySession: Session = {
        id: `demo_heal_${timestamp}_${s}`,
        userId: userId,
        exerciseType: exerciseType,
        side: healthySide,
        timestamp: timestamp + s * 3600000 * 4 + 600000, // 10 mins apart
        duration: 200 + Math.floor(Math.random() * 60),
        avgFlexion: 125 * 0.8,
        exerciseIds: [exerciseType],
        synced: false,
        updatedAt: timestamp,
        analytics: {
          avgActivation: healthyActivation,
          maxActivation: healthyActivation * 1.9,
          deficitPercentage: 2,
          fatigueScore: 0.1,
          romDegrees: 125 + Math.random() * 5,
          exerciseQuality: 0.98,
          completionRate: 100,
          intensityScore: 9,
          normalizedChannelMeans: healthyChannels,
        },
      };

      await insertSession(healthySession);
      sessions.push(healthySession);
    }
  }

  return sessions.length;
}
