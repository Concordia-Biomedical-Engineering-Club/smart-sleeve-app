import React from "react";
import { View, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Shadows, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import {
  computeActivationInsights,
  WARNING_THRESHOLD,
} from "@/services/SymmetryService";

interface SymmetryCardProps {
  normalizedPct: number[];
}

export default function SymmetryCard({ normalizedPct }: SymmetryCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  if (!normalizedPct || normalizedPct.length < 4) return null;

  const result = computeActivationInsights(normalizedPct);

  const scoreColor =
    result.activationScore >= 80
      ? theme.success
      : result.activationScore >= 60
        ? theme.warning
        : theme.text;

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText style={[styles.eyebrow, { color: theme.textSecondary }]}>
            Single-Leg Insights
          </ThemedText>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Muscle Activation
          </ThemedText>
        </View>
        {result.hasAnyWarning && (
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
        Live % MVC snapshot for the instrumented leg. Use this to spot uneven
        quad loading and hamstring over-activity.
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
            Activation
          </ThemedText>
          <ThemedText style={[styles.scoreValue, { color: scoreColor }]}>
            {result.activationScore}
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
                    result.vmoVlBalance > WARNING_THRESHOLD
                      ? theme.warning
                      : theme.text,
                },
              ]}
            >
              {result.vmoVlBalance}% gap
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
                    result.hamstringGuarding > 80 ? theme.warning : theme.text,
                },
              ]}
            >
              BF: {result.hamstringGuarding}%
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.channelGrid}>
        {result.channels.map((ch) => (
          <View
            key={ch.channelIndex}
            style={[
              styles.channelChip,
              {
                backgroundColor: theme.secondaryCard,
                borderColor: ch.hasWarning ? theme.warning : theme.border,
              },
            ]}
          >
            <ThemedText
              style={[styles.channelLabel, { color: theme.textSecondary }]}
            >
              {ch.label}
            </ThemedText>
            <ThemedText style={[styles.channelPct, { color: theme.text }]}>
              {ch.normalizedPct}%
            </ThemedText>
            <ThemedText
              style={[
                styles.channelDeficit,
                { color: ch.hasWarning ? theme.warning : theme.textSecondary },
              ]}
            >
              {ch.hasWarning ? `Target gap ${ch.targetGap}%` : "On target"}
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
  channelPct: { fontSize: 20, fontWeight: "800" },
  channelDeficit: { fontSize: 11 },
});
