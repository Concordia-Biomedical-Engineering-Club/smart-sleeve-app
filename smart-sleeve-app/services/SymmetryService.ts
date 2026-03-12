import type { Session } from "@/services/Database";
import type { InjuredSide } from "@/store/userSlice";

export const WARNING_THRESHOLD = 30;

export interface BilateralChannelComparison {
  channelIndex: number;
  label: string;
  healthyPct: number;
  injuredPct: number;
  deficit: number;
  hasWarning: boolean;
}

export interface BilateralComparisonResult {
  symmetryScore: number;
  channels: BilateralChannelComparison[];
  vmoVlBalance: number;
  hamstringGuarding: number;
  hasAnyWarning: boolean;
  exerciseType: string;
  healthySide: InjuredSide;
  injuredSide: InjuredSide;
  healthySessionId: string;
  injuredSessionId: string;
}

const CHANNEL_LABELS = ["VMO", "VL", "ST", "BF"];

function getNormalizedChannelMeans(session: Session): number[] | null {
  const normalizedChannelMeans = session.analytics.normalizedChannelMeans;

  if (!normalizedChannelMeans || normalizedChannelMeans.length < 4) {
    return null;
  }

  return normalizedChannelMeans.slice(0, 4).map((value) => Math.round(value));
}

export function buildBilateralComparison(
  healthySession: Session,
  injuredSession: Session,
): BilateralComparisonResult {
  const healthyMeans = getNormalizedChannelMeans(healthySession);
  const injuredMeans = getNormalizedChannelMeans(injuredSession);

  if (!healthyMeans || !injuredMeans) {
    throw new Error(
      "Both sessions need normalized channel summaries for bilateral comparison.",
    );
  }

  const channels: BilateralChannelComparison[] = CHANNEL_LABELS.map(
    (label, channelIndex) => {
      const healthyPct = healthyMeans[channelIndex] ?? 0;
      const injuredPct = injuredMeans[channelIndex] ?? 0;
      const deficit = Math.max(0, healthyPct - injuredPct);

      return {
        channelIndex,
        label,
        healthyPct,
        injuredPct,
        deficit,
        hasWarning: deficit > WARNING_THRESHOLD,
      };
    },
  );

  const averageDeficit =
    channels.reduce((sum, channel) => sum + channel.deficit, 0) /
    channels.length;
  const symmetryScore = Math.max(0, Math.round(100 - averageDeficit));
  const vmoVlBalance = Math.abs(
    (injuredMeans[0] ?? 0) - (injuredMeans[1] ?? 0),
  );
  const hamstringGuarding = Math.max(
    0,
    (injuredMeans[3] ?? 0) - (healthyMeans[3] ?? 0),
  );
  const hasAnyWarning = channels.some((channel) => channel.hasWarning);

  return {
    symmetryScore,
    channels,
    vmoVlBalance,
    hamstringGuarding,
    hasAnyWarning,
    exerciseType: injuredSession.exerciseType,
    healthySide: healthySession.side,
    injuredSide: injuredSession.side,
    healthySessionId: healthySession.id,
    injuredSessionId: injuredSession.id,
  };
}

export function findLatestBilateralComparison(
  sessions: Session[],
  injuredSide: InjuredSide,
): BilateralComparisonResult | null {
  const healthySide = injuredSide === "LEFT" ? "RIGHT" : "LEFT";
  const injuredSessions = sessions
    .filter(
      (session) =>
        session.side === injuredSide &&
        getNormalizedChannelMeans(session) !== null,
    )
    .sort((left, right) => right.timestamp - left.timestamp);

  for (const injuredSession of injuredSessions) {
    const healthySession = sessions
      .filter(
        (session) =>
          session.side === healthySide &&
          session.exerciseType === injuredSession.exerciseType &&
          getNormalizedChannelMeans(session) !== null,
      )
      .sort((left, right) => right.timestamp - left.timestamp)[0];

    if (healthySession) {
      return buildBilateralComparison(healthySession, injuredSession);
    }
  }

  return null;
}
