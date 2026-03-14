export type Side = "LEFT" | "RIGHT";

export interface SessionAnalytics {
  avgActivation: number;
  maxActivation: number;
  deficitPercentage: number;
  fatigueScore: number;
  romDegrees: number;
  exerciseQuality: number;
  completionRate: number;
  intensityScore: number;
}

export interface Session {
  id: string;
  userId: string;
  exerciseType: string;
  side: Side;
  timestamp: number;
  duration: number;
  avgFlexion: number;
  completedReps: number;
  targetReps: number;
  exerciseIds: string[];
  analytics: SessionAnalytics;
  synced: boolean;
  updatedAt: number;
}

export interface Patient {
  uid: string;
  email: string | null;
  displayName: string | null;
  injuredSide: Side | null;
  therapyGoal: string | null;
  lastSessionAt: number | null;
  riskStatus: "low" | "medium" | "high";
  recentSymmetry: number | null;
  recentROM: number | null;
  complianceScore: number | null;
}
