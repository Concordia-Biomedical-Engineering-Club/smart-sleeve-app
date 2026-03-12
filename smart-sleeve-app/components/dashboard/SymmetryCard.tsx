import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Shadows, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import {
  type BilateralComparisonResult,
  WARNING_THRESHOLD,
} from "@/services/SymmetryService";
import { EXERCISE_LIBRARY } from "@/constants/exercises";

// Arc gauge constants
const GAUGE_SIZE = 140;
const GAUGE_STROKE = 12;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = GAUGE_RADIUS * 2 * Math.PI;

interface SymmetryCardProps {
  comparison: BilateralComparisonResult;
}

export default function SymmetryCard({ comparison }: SymmetryCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const exerciseName =
    EXERCISE_LIBRARY.find((e) => e.id === comparison.exerciseType)?.name ??
    comparison.exerciseType;

  const score = comparison.symmetryScore;
  const scoreColor =
    score >= 85 ? theme.success : score >= 60 ? "#F59E0B" : theme.warning;
  const strokeDashoffset =
    GAUGE_CIRCUMFERENCE - (score / 100) * GAUGE_CIRCUMFERENCE;

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText style={[styles.eyebrow, { color: theme.textSecondary }]}>
            {exerciseName} · Bilateral Analysis
          </ThemedText>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Symmetry Score
          </ThemedText>
        </View>
        {comparison.hasAnyWarning && (
          <View
            style={[
              styles.warningPill,
              {
                backgroundColor: theme.warning + "10",
                borderColor: theme.warning + "30",
              },
            ]}
          >
            <ThemedText style={[styles.warningText, { color: theme.warning }]}>
              Deficit Detected
            </ThemedText>
          </View>
        )}
      </View>

      {/* Score gauge + insights */}
      <View style={styles.scoreRow}>
        {/* SVG arc gauge */}
        <View style={styles.gaugeWrap}>
          <Svg
            width={GAUGE_SIZE}
            height={GAUGE_SIZE}
            viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
          >
            <Defs>
              <LinearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={scoreColor} stopOpacity="1" />
                <Stop offset="1" stopColor={scoreColor} stopOpacity="0.8" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={GAUGE_RADIUS}
              stroke={theme.border}
              strokeWidth={GAUGE_STROKE}
              fill="none"
              strokeOpacity={0.15}
            />
            <Circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={GAUGE_RADIUS}
              stroke="url(#scoreGrad)"
              strokeWidth={GAUGE_STROKE}
              fill="none"
              strokeDasharray={GAUGE_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.gaugeInner}>
            <ThemedText style={[styles.gaugeScore, { color: theme.text }]}>
              {score}
            </ThemedText>
            <ThemedText
              style={[styles.gaugeUnit, { color: theme.textSecondary }]}
            >
              pts
            </ThemedText>
          </View>
        </View>

        {/* Insight rows + side labels */}
        <View style={styles.insightsCol}>
          <InsightRow
            label="Quad Balance"
            value={`${comparison.vmoVlBalance}%`}
            suffix="gap"
            isWarning={comparison.vmoVlBalance > WARNING_THRESHOLD}
            theme={theme}
          />
          <InsightRow
            label="Hamstring Load"
            value={`${comparison.hamstringGuarding}%`}
            suffix="shift"
            isWarning={comparison.hamstringGuarding > 0}
            theme={theme}
          />
          {/* Healthy vs Injured leg labels */}
          <View
            style={[styles.sidesRow, { backgroundColor: theme.secondaryCard }]}
          >
            <View style={styles.sideBadge}>
              <View
                style={[styles.sideDot, { backgroundColor: theme.success }]}
              />
              <ThemedText
                style={[styles.sideLabel, { color: theme.textSecondary }]}
              >
                Healthy
              </ThemedText>
              <ThemedText style={[styles.sideSide, { color: theme.text }]}>
                {comparison.healthySide[0]}
              </ThemedText>
            </View>
            <View
              style={[styles.sidesDivider, { backgroundColor: theme.border, opacity: 0.5 }]}
            />
            <View style={styles.sideBadge}>
              <View
                style={[styles.sideDot, { backgroundColor: theme.warning }]}
              />
              <ThemedText
                style={[styles.sideLabel, { color: theme.textSecondary }]}
              >
                Injured
              </ThemedText>
              <ThemedText style={[styles.sideSide, { color: theme.text }]}>
                {comparison.injuredSide[0]}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Per-muscle channel chips with bar comparisons */}
      <View style={styles.channelGrid}>
        {comparison.channels.map((ch) => (
          <ChannelChip key={ch.channelIndex} channel={ch} theme={theme} />
        ))}
      </View>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function InsightRow({
  label,
  value,
  suffix,
  isWarning,
  theme,
}: {
  label: string;
  value: string;
  suffix: string;
  isWarning: boolean;
  theme: (typeof Colors)["light"];
}) {
  const color = isWarning ? theme.warning : theme.success;
  return (
    <View
      style={[styles.insightRow, { backgroundColor: theme.secondaryCard + "50" }]}
    >
      <ThemedText style={[styles.insightLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View style={styles.insightValueRow}>
        <ThemedText style={[styles.insightValue, { color }]}>
          {value}
        </ThemedText>
        <ThemedText
          style={[styles.insightSuffix, { color: theme.textSecondary }]}
        >
          {" "}
          {suffix}
        </ThemedText>
      </View>
    </View>
  );
}

function ChannelChip({
  channel,
  theme,
}: {
  channel: BilateralComparisonResult["channels"][number];
  theme: (typeof Colors)["light"];
}) {
  const barColor = channel.hasWarning ? theme.warning : theme.success;
  const healthyWidth = `${Math.min(channel.healthyPct, 100)}%` as const;
  const injuredWidth = `${Math.min(channel.injuredPct, 100)}%` as const;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: theme.cardBackground,
          borderColor: channel.hasWarning
            ? theme.warning + "40"
            : "rgba(0,0,0,0.05)",
        },
      ]}
    >
      <ThemedText style={[styles.chipLabel, { color: theme.textSecondary }]}>
        {channel.label}
      </ThemedText>

      <View style={styles.barContainer}>
        {/* Healthy bar */}
        <View style={styles.barRow}>
          <View style={[styles.barTrack, { backgroundColor: theme.border, opacity: 0.3 }]}>
            <View
              style={[
                styles.barFill,
                { width: healthyWidth, backgroundColor: theme.success },
              ]}
            />
          </View>
          <ThemedText style={[styles.barValue, { color: theme.text }]}>
            {channel.healthyPct}%
          </ThemedText>
        </View>

        {/* Injured bar */}
        <View style={styles.barRow}>
          <View style={[styles.barTrack, { backgroundColor: theme.border, opacity: 0.3 }]}>
            <View
              style={[
                styles.barFill,
                { width: injuredWidth, backgroundColor: barColor },
              ]}
            />
          </View>
          <ThemedText style={[styles.barValue, { color: theme.textSecondary }]}>
            {channel.injuredPct}%
          </ThemedText>
        </View>
      </View>

      {/* Deficit badge */}
      <View
        style={[
          styles.deficitBadge,
          {
            backgroundColor: channel.hasWarning
              ? theme.warning + "10"
              : theme.success + "08",
          },
        ]}
      >
        <ThemedText
          style={[
            styles.deficitText,
            {
              color: channel.hasWarning ? theme.warning : theme.success,
            },
          ]}
        >
          {channel.deficit}% deficit
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    gap: 20,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: { gap: 4 },
  eyebrow: { 
    ...Typography.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  title: { 
    ...Typography.heading3,
    fontSize: 20,
  },
  warningPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: { 
    ...Typography.label,
    fontSize: 10,
    textTransform: "none",
  },

  // Score row
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },

  // SVG gauge
  gaugeWrap: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeScore: { 
    ...Typography.heading1,
    fontSize: 36,
    lineHeight: 42,
  },
  gaugeUnit: { 
    ...Typography.label,
    fontSize: 10,
    marginTop: -4,
  },

  // Insights
  insightsCol: { flex: 1, gap: 10 },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  insightLabel: { 
    ...Typography.caption,
    fontSize: 12,
    fontWeight: "600",
  },
  insightValueRow: { flexDirection: "row", alignItems: "baseline" },
  insightValue: { 
    ...Typography.bodyBold,
    fontSize: 14,
  },
  insightSuffix: { 
    ...Typography.caption,
    fontSize: 10,
    opacity: 0.8,
  },

  // Side badges row
  sidesRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    marginTop: 4,
  },
  sideBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sideDot: { width: 8, height: 8, borderRadius: 4 },
  sideLabel: { 
    ...Typography.label,
    fontSize: 9,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  sideSide: { 
    ...Typography.bodyBold,
    fontSize: 12,
  },
  sidesDivider: { width: 1, height: 16 },

  // Channel grid
  channelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  // Channel chip
  chip: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    ...Shadows.card,
    shadowOpacity: 0.03,
  },
  chipLabel: { 
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  barContainer: {
    gap: 8,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  barValue: { 
    ...Typography.label,
    fontSize: 10,
    width: 28,
    textAlign: "right",
  },
  deficitBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  deficitText: { 
    ...Typography.label,
    fontSize: 10,
    textTransform: "none",
  },
});
