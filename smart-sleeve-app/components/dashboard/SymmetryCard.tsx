import React from "react";
import { View, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Shadows, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import {
  type BilateralComparisonResult,
  WARNING_THRESHOLD,
} from "@/services/SymmetryService";
import { EXERCISE_LIBRARY } from "@/constants/exercises";

interface SymmetryCardProps {
  comparison: BilateralComparisonResult;
}

export default function SymmetryCard({ comparison }: SymmetryCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const exerciseName =
    EXERCISE_LIBRARY.find((exercise) => exercise.id === comparison.exerciseType)
      ?.name ?? comparison.exerciseType;

  const scoreColor =
    comparison.symmetryScore >= 85
      ? theme.success
      : comparison.symmetryScore >= 60
        ? theme.text
        : theme.warning;

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText style={[styles.eyebrow, { color: theme.textSecondary }]}>
            Bilateral Comparison
          </ThemedText>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Symmetry Score
          </ThemedText>
        </View>
        {comparison.hasAnyWarning && (
          <View
            style={[
              styles.alertBadge,
              {
                backgroundColor: theme.warning + "15",
                borderColor: theme.warning,
              },
            ]}
          >
            <ThemedText style={[styles.alertText, { color: theme.warning }]}>
              Gap &gt; {WARNING_THRESHOLD}%
            </ThemedText>
          </View>
        )}
      </View>

      <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
        Latest matched {exerciseName} sessions comparing the healthy{" "}
        {comparison.healthySide.toLowerCase()} leg against the injured{" "}
        {comparison.injuredSide.toLowerCase()} leg.
      </ThemedText>

      <View style={styles.scoreRow}>
        <View
          style={[
            styles.scoreCircle,
            { borderColor: scoreColor, backgroundColor: theme.secondaryCard },
          ]}
        >
          <ThemedText
            style={[styles.scoreLabel, { color: theme.textSecondary }]}
          >
            Bilateral
          </ThemedText>
          <ThemedText style={[styles.scoreValue, { color: scoreColor }]}>
            {comparison.symmetryScore}
          </ThemedText>
          <ThemedText
            style={[styles.scoreUnit, { color: theme.textSecondary }]}
          >
            out of 100
          </ThemedText>
        </View>

        <View style={styles.insightsCol}>
          <View
            style={[
              styles.insightRow,
              { backgroundColor: theme.secondaryCard },
            ]}
          >
            <ThemedText
              style={[styles.insightLabel, { color: theme.textSecondary }]}
            >
              Quad Balance
            </ThemedText>
            <ThemedText
              style={[
                styles.insightValue,
                {
                  color:
                    comparison.vmoVlBalance > WARNING_THRESHOLD
                      ? theme.warning
                      : theme.text,
                },
              ]}
            >
              {comparison.vmoVlBalance}% gap
            </ThemedText>
          </View>
          <View
            style={[
              styles.insightRow,
              { backgroundColor: theme.secondaryCard },
            ]}
          >
            <ThemedText
              style={[styles.insightLabel, { color: theme.textSecondary }]}
            >
              Hamstring Load
            </ThemedText>
            <ThemedText
              style={[
                styles.insightValue,
                {
                  color:
                    comparison.hamstringGuarding > 0
                      ? theme.warning
                      : theme.text,
                },
              ]}
            >
              {comparison.hamstringGuarding}% over healthy
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.channelGrid}>
        {comparison.channels.map((channel) => (
          <View
            key={channel.channelIndex}
            style={[
              styles.channelChip,
              {
                backgroundColor: theme.secondaryCard,
                borderColor: channel.hasWarning ? theme.warning : theme.border,
              },
            ]}
          >
            <ThemedText
              style={[styles.channelLabel, { color: theme.textSecondary }]}
            >
              {channel.label}
            </ThemedText>
            <ThemedText style={[styles.channelPct, { color: theme.text }]}>
              Healthy {channel.healthyPct}%
            </ThemedText>
            <ThemedText
              style={[
                styles.channelPctSecondary,
                { color: theme.textSecondary },
              ]}
            >
              Injured {channel.injuredPct}%
            </ThemedText>
            <ThemedText
              style={[
                styles.channelDeficit,
                {
                  color: channel.hasWarning
                    ? theme.warning
                    : theme.textSecondary,
                },
              ]}
            >
              Deficit {channel.deficit}%
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { ...Typography.label },
  title: { ...Typography.heading3 },
  subtitle: { ...Typography.caption },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: { fontSize: 12, fontWeight: "600" },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  scoreCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  scoreLabel: { ...Typography.label },
  scoreValue: { fontSize: 30, fontWeight: "800" },
  scoreUnit: { fontSize: 11, textAlign: "center" },
  insightsCol: { flex: 1, gap: 8 },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
  },
  insightLabel: { fontSize: 12, flex: 1 },
  insightValue: { fontSize: 12, fontWeight: "700" },
  channelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  channelChip: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  channelLabel: { fontSize: 11, fontWeight: "600" },
  channelPct: { fontSize: 18, fontWeight: "800" },
  channelPctSecondary: { fontSize: 14, fontWeight: "600" },
  channelDeficit: { fontSize: 11 },
});
