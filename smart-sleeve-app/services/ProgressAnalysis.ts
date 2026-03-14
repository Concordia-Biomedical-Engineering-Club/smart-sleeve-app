import { EXERCISE_LIBRARY } from "@/constants/exercises";
import { Session } from "@/services/Database";
import { EMGData } from "@/services/SleeveConnector/ISleeveConnector";
import { normalize } from "@/services/NormalizationService";
import type { CalibrationCoefficients } from "@/store/userSlice";

export interface SessionComparison {
  previousSession: Session;
  qualityDelta: number;
  romDelta: number;
  durationDelta: number;
  fatigueDelta: number;
}

export interface SessionRecommendation {
  title: string;
  message: string;
  tone: "positive" | "neutral" | "warning";
}

export type TimeframeOption = "7D" | "30D" | "90D";

export function findPreviousSession(
  sessions: Session[],
  currentSession: Session,
): Session | null {
  const previousSessions = sessions
    .filter(
      (session) =>
        session.id !== currentSession.id &&
        session.userId === currentSession.userId &&
        session.exerciseType === currentSession.exerciseType &&
        session.side === currentSession.side &&
        session.timestamp < currentSession.timestamp,
    )
    .sort((left, right) => right.timestamp - left.timestamp);

  return previousSessions[0] ?? null;
}

export function buildSessionComparison(
  currentSession: Session,
  previousSession: Session | null,
): SessionComparison | null {
  if (!previousSession) return null;

  return {
    previousSession,
    qualityDelta: roundToOneDecimal(
      (currentSession.analytics.exerciseQuality -
        previousSession.analytics.exerciseQuality) *
        100,
    ),
    romDelta: roundToOneDecimal(
      currentSession.analytics.romDegrees -
        previousSession.analytics.romDegrees,
    ),
    durationDelta: roundToOneDecimal(
      currentSession.duration - previousSession.duration,
    ),
    fatigueDelta: roundToOneDecimal(
      currentSession.analytics.fatigueScore -
        previousSession.analytics.fatigueScore,
    ),
  };
}

export function computeCompletionRate(session: Session): number {
  if (
    typeof session.analytics.completionRate === "number" &&
    session.analytics.completionRate > 0
  ) {
    return clamp(Math.round(session.analytics.completionRate), 0, 100);
  }

  const exercise = EXERCISE_LIBRARY.find(
    (item) => item.id === session.exerciseType,
  );
  const targetReps = session.targetReps ?? exercise?.targetReps ?? 0;

  if (
    targetReps > 0 &&
    typeof session.completedReps === "number" &&
    session.completedReps >= 0
  ) {
    return clamp(
      Math.round((session.completedReps / targetReps) * 100),
      0,
      100,
    );
  }

  if (!exercise) return 0;

  const expectedDuration =
    3 +
    exercise.targetReps * exercise.workDurationSec +
    Math.max(exercise.targetReps - 1, 0) * exercise.restDurationSec;

  return clamp(Math.round((session.duration / expectedDuration) * 100), 0, 100);
}

export function computeIntensityScore(session: Session): number {
  if (
    typeof session.analytics.intensityScore === "number" &&
    session.analytics.intensityScore > 0
  ) {
    return roundToOneDecimal(clamp(session.analytics.intensityScore, 0, 10));
  }

  const exercise = EXERCISE_LIBRARY.find(
    (item) => item.id === session.exerciseType,
  );
  const completionFactor = computeCompletionRate(session) / 100;
  const activationComponent =
    clamp(session.analytics.avgActivation / 0.45, 0, 1) * 5;
  const peakComponent = clamp(session.analytics.maxActivation / 0.8, 0, 1) * 3;
  const completionComponent = completionFactor * 2;
  const romComponent =
    exercise && exercise.id === "heel-slides"
      ? clamp(session.analytics.romDegrees / 90, 0, 1)
      : clamp(session.analytics.romDegrees / 120, 0, 1);

  return roundToOneDecimal(
    clamp(
      activationComponent + peakComponent + completionComponent + romComponent,
      0,
      10,
    ),
  );
}

export function computeDeficitPercentageFromEMGFrames(
  emgFrames: Pick<EMGData, "channels">[],
  calibration?: CalibrationCoefficients | null,
): number {
  if (emgFrames.length === 0) return 0;

  const imbalance = emgFrames.reduce((total, frame) => {
    const channels =
      calibration && calibration.calibratedAt !== null
        ? normalize(frame.channels, calibration)
        : frame.channels;
    const vmo = Math.abs(channels[0] ?? 0);
    const vl = Math.abs(channels[1] ?? 0);
    const denominator = vmo + vl;

    if (denominator === 0) return total;
    return total + Math.abs(vmo - vl) / denominator;
  }, 0);

  return roundToOneDecimal((imbalance / emgFrames.length) * 100);
}

export function buildMetricTrend(
  sessions: Session[],
  timeframe: TimeframeOption,
  metric: "romDegrees" | "exerciseQuality" | "muscleBalance",
): { labels: string[]; values: number[] } {
  const days = timeframe === "7D" ? 7 : timeframe === "30D" ? 30 : 90;

  // 1. Generate all dates in the period
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    return date;
  });

  // 2. Map every date to a value — skip days with no sessions
  const points: { date: Date; value: number }[] = [];

  dates.forEach((date, index) => {
    const matchingSessions = sessions.filter(
      (session) =>
        new Date(session.timestamp).toDateString() === date.toDateString(),
    );

    if (matchingSessions.length === 0) return;

    const value =
      metric === "romDegrees"
        ? Math.max(
            ...matchingSessions.map((session) => session.analytics.romDegrees),
          )
        : metric === "exerciseQuality"
          ? roundToOneDecimal(
              (matchingSessions.reduce(
                (sum, session) => sum + session.analytics.exerciseQuality,
                0,
              ) /
                matchingSessions.length) *
                100,
            )
          : roundToOneDecimal(
              matchingSessions.reduce((sum, session) => {
                const channels = session.analytics.normalizedChannelMeans || [
                  0, 0, 0, 0,
                ];
                const vmo = channels[0] || 0;
                const vl = channels[1] || 1; // Avoid div by zero
                const ratio = (vmo / (vmo + vl)) * 100;
                return sum + (isNaN(ratio) ? 0 : ratio);
              }, 0) / matchingSessions.length,
            );

    points.push({ date, value });
  });

  return {
    labels: points.map(({ date }, pointIndex) => {
      if (days <= 7) {
        return date.toLocaleDateString([], { weekday: "short" });
      }

      const labelStep = days === 30 ? 5 : 14;
      return pointIndex % labelStep === 0 || pointIndex === points.length - 1
        ? date.toLocaleDateString([], { month: "short", day: "numeric" })
        : "";
    }),
    values: points.map(({ value }) => value),
  };
}

export function generateSessionRecommendation(
  session: Session,
  previousSession: Session | null,
): SessionRecommendation {
  const exercise = EXERCISE_LIBRARY.find(
    (item) => item.id === session.exerciseType,
  );
  const completionRate = computeCompletionRate(session);
  const intensityScore = computeIntensityScore(session);
  const comparison = buildSessionComparison(session, previousSession);

  if (!comparison) {
    return {
      title: "First session logged",
      message:
        completionRate >= 90
          ? `You completed a strong first ${exercise?.name ?? "session"}. Keep this rhythm for your next check-in.`
          : `Good start on ${exercise?.name ?? "this exercise"}. Aim for a steadier finish to raise completion next time.`,
      tone: completionRate >= 90 ? "positive" : "neutral",
    };
  }

  if (comparison.qualityDelta <= -8) {
    return {
      title: "Quality slipped from last time",
      message: `Quality is down ${Math.abs(comparison.qualityDelta).toFixed(1)} points. Slow the movement and focus on cleaner quad activation before increasing load.`,
      tone: "warning",
    };
  }

  if (comparison.romDelta >= 5 && comparison.qualityDelta >= 5) {
    return {
      title: "Clear progress vs. last session",
      message: `ROM is up ${comparison.romDelta.toFixed(1)}° and quality improved by ${comparison.qualityDelta.toFixed(1)} points. Keep the same tempo and form cues.`,
      tone: "positive",
    };
  }

  if (completionRate < 75) {
    return {
      title: "Finish rate needs attention",
      message: `Completion is at ${completionRate}%. Reduce pace or take slightly longer rests so you can finish the full set with control.`,
      tone: "warning",
    };
  }

  if (intensityScore < 4) {
    return {
      title: "Intensity stayed low",
      message: `Intensity scored ${intensityScore}/10. Try holding peak contraction a little longer to raise activation without sacrificing quality.`,
      tone: "neutral",
    };
  }

  return {
    title: "Session stayed on track",
    message: `You maintained a ${Math.round(session.analytics.exerciseQuality * 100)}% quality score with ${session.analytics.romDegrees.toFixed(0)}° ROM. Keep building consistency over the next few sessions.`,
    tone: "neutral",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
