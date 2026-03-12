// Computes single-leg muscle activation insights from normalized % MVC values.
// The app currently streams one four-channel sleeve, so this service reports
// same-leg activation quality and muscle-balance signals instead of bilateral symmetry.

export const WARNING_THRESHOLD = 30; // % below MVC target to trigger a warning

export interface ChannelActivationInsight {
  channelIndex: number;
  label: string;
  normalizedPct: number;
  targetGap: number;
  hasWarning: boolean;
}

export interface ActivationInsightResult {
  activationScore: number;
  channels: ChannelActivationInsight[];
  vmoVlBalance: number;
  hamstringGuarding: number;
  hasAnyWarning: boolean;
}

const CHANNEL_LABELS = ["VMO", "VL", "ST", "BF"];

export function computeActivationInsights(
  normalizedPct: number[],
): ActivationInsightResult {
  const channels: ChannelActivationInsight[] = normalizedPct
    .slice(0, 4)
    .map((pct, index) => {
      const roundedPct = Math.round(pct);
      const targetGap = Math.max(0, Math.round(100 - pct));

      return {
        channelIndex: index,
        label: CHANNEL_LABELS[index],
        normalizedPct: roundedPct,
        targetGap,
        hasWarning: targetGap > WARNING_THRESHOLD,
      };
    });

  const activationScore = Math.round(
    channels.reduce(
      (sum, channel) => sum + Math.min(channel.normalizedPct, 100),
      0,
    ) / channels.length,
  );
  const vmoVlBalance = Math.round(
    Math.abs(channels[0].normalizedPct - channels[1].normalizedPct),
  );
  const hamstringGuarding = Math.round(channels[3].normalizedPct);
  const hasAnyWarning = channels.some((channel) => channel.hasWarning);

  return {
    activationScore,
    channels,
    vmoVlBalance,
    hamstringGuarding,
    hasAnyWarning,
  };
}
