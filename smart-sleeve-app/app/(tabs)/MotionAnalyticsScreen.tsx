import React, { useEffect, useState, useMemo } from "react";
import { StyleSheet, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Shadows } from "@/constants/theme";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { TrendChart } from "@/components/analytics/TrendChart";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { fetchSessionsByFilters, Session } from "@/services/Database";
import {
  buildMetricTrend,
  generateSessionRecommendation,
  findPreviousSession,
  TimeframeOption,
} from "@/services/ProgressAnalysis";
import { computeHistoricalSymmetryTrends } from "@/services/SymmetryService";

export default function MotionAnalyticsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const user = useSelector((state: RootState) => state.user);
  const injuredSide = user.injuredSide;
  const [timeframe, setTimeframe] = useState<
    "Weekly" | "Monthly" | "Quarterly"
  >("Weekly");
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const userId = user.uid ?? user.email ?? "guest_user";
        // Fetch last 90 days to cover all timeframes
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        const fetched = await fetchSessionsByFilters({
          userId,
          startTimestamp: startDate.getTime(),
        });
        setSessions(fetched);
      } catch (err) {
        console.error("Failed to load sessions for motion analytics", err);
      }
    };
    loadSessions();
  }, [user.uid, user.email]);

  const chartData = useMemo(() => {
    const tfOption: TimeframeOption =
      timeframe === "Weekly" ? "7D" : timeframe === "Monthly" ? "30D" : "90D";

    const romTrend = buildMetricTrend(sessions, tfOption, "romDegrees");
    const qualityTrend = buildMetricTrend(
      sessions,
      tfOption,
      "exerciseQuality",
    );
    const balanceTrend = buildMetricTrend(sessions, tfOption, "muscleBalance");

    const tfDays = tfOption === "7D" ? 7 : tfOption === "30D" ? 30 : 90;
    const tfStartDate = new Date();
    tfStartDate.setHours(0, 0, 0, 0);
    tfStartDate.setDate(tfStartDate.getDate() - (tfDays - 1));
    const tfStart = tfStartDate.getTime();
    const allSymmetryPoints = computeHistoricalSymmetryTrends(
      sessions,
      injuredSide || "LEFT",
    );
    const symmetryPoints = allSymmetryPoints.filter(
      (p) => p.timestamp >= tfStart,
    );

    const hasData = romTrend.values.length > 0;
    const hasSymmetryData = symmetryPoints.length > 0;

    return {
      motion: {
        labels: hasData
          ? romTrend.labels.length === 1
            ? [romTrend.labels[0], romTrend.labels[0]]
            : romTrend.labels
          : ["", ""],
        datasets: [
          {
            data: hasData
              ? romTrend.values.length === 1
                ? [romTrend.values[0], romTrend.values[0]]
                : romTrend.values
              : [0, 0],
            color: () => theme.primary,
            strokeWidth: 3,
          } as any,
          {
            data: hasData
              ? qualityTrend.values.length === 1
                ? [qualityTrend.values[0], qualityTrend.values[0]]
                : qualityTrend.values
              : [0, 0],
            color: () => theme.success,
            strokeWidth: 3,
          } as any,
        ],
        legend: ["Range of Motion (°)", "Quality Score (%)"],
      },
      balance: {
        labels: hasData
          ? balanceTrend.labels.length === 1
            ? [balanceTrend.labels[0], balanceTrend.labels[0]]
            : balanceTrend.labels
          : ["", ""],
        datasets: [
          {
            data: hasData
              ? balanceTrend.values.length === 1
                ? [balanceTrend.values[0], balanceTrend.values[0]]
                : balanceTrend.values
              : [0, 0],
            color: () => "#8338EC",
            strokeWidth: 3,
          } as any,
        ],
        legend: ["VMO Activation Ratio (%)"],
      },
      symmetry: {
        labels: hasSymmetryData
          ? symmetryPoints.length === 1
            ? [
                new Date(symmetryPoints[0].timestamp).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                }),
                new Date(symmetryPoints[0].timestamp).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                }),
              ]
            : symmetryPoints.map((p) =>
                new Date(p.timestamp).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                }),
              )
          : ["No data", ""],
        datasets: [
          {
            data: hasSymmetryData
              ? symmetryPoints.length === 1
                ? [symmetryPoints[0].symmetryScore, symmetryPoints[0].symmetryScore]
                : symmetryPoints.map((p) => p.symmetryScore)
              : [0, 0],
            color: () => theme.primary,
            strokeWidth: 3,
          } as any,
        ],
        legend: ["Bilateral Symmetry Score"],
      },
    };
  }, [sessions, timeframe, theme, injuredSide]);

  const insight = useMemo(() => {
    if (sessions.length === 0) return null;
    const latest = sessions[0];
    const previous = findPreviousSession(sessions, latest);
    return generateSessionRecommendation(latest, previous);
  }, [sessions]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          badgeLabel="BIOMETRIC ANALYTICS"
          onRightPress={() => console.log("Notification")}
          rightIcon="bell.fill"
        />

        <ThemedText type="title" style={styles.pageTitle}>
          Motion Patterns
        </ThemedText>

        <View style={styles.selectorWrapper}>
          <SegmentedControl
            options={["Weekly", "Monthly", "Quarterly"]}
            selectedOption={timeframe}
            onSelect={(val) => setTimeframe(val as any)}
          />
        </View>

        <View style={styles.chartContainer}>
          <TrendChart
            data={chartData.motion}
            title="Range of Motion"
            subtitle={`Peak ROM & Form Quality trend (${timeframe.toLowerCase()})`}
            height={220}
          />
        </View>

        <View style={styles.chartContainer}>
          <TrendChart
            data={chartData.balance}
            title="Muscle Activation Ratio"
            subtitle={`Medial vs Lateral Quad symmetry (Goal: 50%)`}
            height={220}
          />
        </View>

        {injuredSide && (
          <View style={styles.chartContainer}>
            <TrendChart
              data={chartData.symmetry}
              title="Bilateral Recovery"
              subtitle={`Injured vs Healthy leg symmetry trend`}
              height={220}
            />
          </View>
        )}

        <View style={styles.insightsSection}>
          <ThemedText
            type="label"
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            KEY INSIGHTS
          </ThemedText>

          {insight ? (
            <View
              style={[
                styles.insightCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
                Shadows.card,
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor:
                      insight.tone === "positive"
                        ? theme.success + "15"
                        : insight.tone === "warning"
                          ? theme.warning + "15"
                          : theme.primary + "15",
                  },
                ]}
              >
                <IconSymbol
                  name={
                    insight.tone === "positive"
                      ? "checkmark.seal.fill"
                      : insight.tone === "warning"
                        ? "exclamationmark.triangle.fill"
                        : "info.circle.fill"
                  }
                  size={20}
                  color={
                    insight.tone === "positive"
                      ? theme.success
                      : insight.tone === "warning"
                        ? theme.warning
                        : theme.primary
                  }
                />
              </View>
              <View style={styles.insightContent}>
                <ThemedText type="bodyBold" style={{ marginBottom: 4 }}>
                  {insight.title}
                </ThemedText>
                <ThemedText
                  style={[styles.insightText, { color: theme.textSecondary }]}
                >
                  {insight.message}
                </ThemedText>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.insightCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
                Shadows.card,
              ]}
            >
              <View style={styles.insightContent}>
                <ThemedText
                  style={[styles.insightText, { color: theme.textSecondary }]}
                >
                  Keep exercising to unlock dynamic insights and coach
                  recommendations.
                </ThemedText>
              </View>
            </View>
          )}

          {/* Placeholder for secondary insight or coach tip */}
          <View
            style={[
              styles.insightCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
              Shadows.card,
            ]}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: theme.primary + "15" },
              ]}
            >
              <IconSymbol
                name="lightbulb.fill"
                size={20}
                color={theme.primary}
              />
            </View>
            <View style={styles.insightContent}>
              <ThemedText type="bodyBold" style={{ marginBottom: 4 }}>
                Recovery Tip
              </ThemedText>
              <ThemedText
                style={[styles.insightText, { color: theme.textSecondary }]}
              >
                Ensure you are performing your heel slides slowly to maximize
                tendon gliding and joint lubrication.
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  pageTitle: { marginBottom: 24 },
  selectorWrapper: { marginBottom: 32 },
  chartContainer: { marginBottom: 40 },
  insightsSection: { gap: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  insightCard: {
    padding: 20,
    borderRadius: 24,
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  insightContent: { flex: 1 },
  insightText: { fontSize: 14, lineHeight: 20 },
});
