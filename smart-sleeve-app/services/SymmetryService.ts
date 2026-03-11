// SymmetryService.ts
// Computes bilateral muscle symmetry metrics from normalized % MVC values.
// Since the sleeve has 4 channels on one leg, we compare:
//   - VMO (ch0) vs VL (ch1): quad balance
//   - Semitendinosus (ch2) vs Biceps Femoris (ch3): hamstring balance
//   - Overall symmetry score: how close all channels are to 100% MVC target

export const WARNING_THRESHOLD = 30; // % deficit to trigger red warning

export interface ChannelSymmetry {
  channelIndex: number;
  label: string;
  normalizedPct: number;
  deficit: number;        // |100 - normalizedPct|
  hasWarning: boolean;    // deficit > WARNING_THRESHOLD
}

export interface SymmetryResult {
  symmetryScore: number;          // 0-100%
  channels: ChannelSymmetry[];
  vmoVlBalance: number;           // |VMO% - VL%|
  hamstringGuarding: number;      // BF% (high = over-active)
  hasAnyWarning: boolean;
}

const CHANNEL_LABELS = ['VMO', 'VL', 'Semitendinosus', 'Biceps Femoris'];

export function computeSymmetry(normalizedPct: number[]): SymmetryResult {
  const channels: ChannelSymmetry[] = normalizedPct.slice(0, 4).map((pct, i) => {
    const deficit = Math.abs(100 - pct);
    return {
      channelIndex: i,
      label: CHANNEL_LABELS[i],
      normalizedPct: Math.round(pct),
      deficit: Math.round(deficit),
      hasWarning: deficit > WARNING_THRESHOLD,
    };
  });

  // Average deficit across all 4 channels → symmetry score
  const avgDeficit = channels.reduce((sum, ch) => sum + ch.deficit, 0) / channels.length;
  const symmetryScore = Math.max(0, Math.round(100 - avgDeficit));

  // VMO vs VL quad balance
  const vmoVlBalance = Math.round(Math.abs(channels[0].normalizedPct - channels[1].normalizedPct));

  // Biceps Femoris activity (high = hamstring guarding)
  const hamstringGuarding = Math.round(channels[3].normalizedPct);

  const hasAnyWarning = channels.some(ch => ch.hasWarning);

  return { symmetryScore, channels, vmoVlBalance, hamstringGuarding, hasAnyWarning };
}