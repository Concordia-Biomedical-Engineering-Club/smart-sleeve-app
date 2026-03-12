import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import { ThemedText } from "@/components/themed-text";
import { Colors, Shadows, Typography } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  Session,
  fetchEMGSamplesBySession,
  fetchPreviousSessionForExercise,
  fetchSessionById,
} from "@/services/Database";
import { EXERCISE_LIBRARY } from "@/constants/exercises";
import StatCard from "@/components/StatCard";
import {
  buildSessionComparison,
  computeCompletionRate,
  computeIntensityScore,
  generateSessionRecommendation,
} from "@/services/ProgressAnalysis";

import { ScreenHeader } from "@/components/ui/ScreenHeader";

const screenWidth = Dimensions.get("window").width;

export default function SessionSummaryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [session, setSession] = useState<Session | null>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setErrorMessage(null);
        const loadedSession = await fetchSessionById(String(id));

        if (!loadedSession) {
          setIsLoading(false);
          return;
        }

        setSession(loadedSession);
        setPreviousSession(
          await fetchPreviousSessionForExercise({
            userId: loadedSession.userId,
            exerciseType: loadedSession.exerciseType,
            side: loadedSession.side,
            beforeTimestamp: loadedSession.timestamp,
          }),
        );

        // Fetch EMG samples
        const emgSamples = await fetchEMGSamplesBySession(id as string);
        setSamples(emgSamples);
      } catch (e) {
        console.error("Failed to load session details", e);
        setErrorMessage("Unable to load this session summary.");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadData();
  }, [id]);

  const exerciseInfo = useMemo(() => {
    return EXERCISE_LIBRARY.find((ex) => ex.id === session?.exerciseType);
  }, [session?.exerciseType]);

  const comparison = useMemo(() => {
    if (!session) return null;
    return buildSessionComparison(session, previousSession);
  }, [previousSession, session]);

  const completionRate = useMemo(() => {
    if (!session) return 0;
    return computeCompletionRate(session);
  }, [session]);

  const intensityScore = useMemo(() => {
    if (!session) return 0;
    return computeIntensityScore(session);
  }, [session]);

  const recommendation = useMemo(() => {
    if (!session) return null;
    return generateSessionRecommendation(session, previousSession);
  }, [previousSession, session]);

  const handleShare = async () => {
    if (!session) return;
    try {
      await Share.share({
        message: `My Smart Sleeve Workout: ${exerciseInfo?.name || "General Session"} - Quality: ${Math.round(session.analytics.exerciseQuality * 100)}%, ROM: ${Math.round(session.analytics.romDegrees)}°`,
        title: "Smart Sleeve Session Summary",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const chartData = useMemo(() => {
    if (samples.length === 0) return null;

    // Downsample for the chart (max 50 points to avoid lag)
    const step = Math.max(1, Math.floor(samples.length / 50));
    const downsampled = samples.filter((_, i) => i % step === 0);

    // Compute smoothed, rectified muscle activation envelope.
    const SMOOTH_WINDOW = 5;
    const EMG_SCALE = 120; // maps 1.0 -> 120 (same range as max knee angle)
    const rawAbs = downsampled.map((s) => Math.abs(s.vmo_rms));
    const smoothed = rawAbs.map((_, i) => {
      const start = Math.max(0, i - SMOOTH_WINDOW + 1);
      const window = rawAbs.slice(start, i + 1);
      return (window.reduce((a, b) => a + b, 0) / window.length) * EMG_SCALE;
    });

    return {
      labels: [],
      datasets: [
        {
          data: downsampled.map((s) => s.kneeAngle),
          color: (opacity = 1) => theme.primary,
          strokeWidth: 3,
        },
        {
          data: smoothed,
          color: (opacity = 1) => theme.success,
          strokeWidth: 2,
        },
      ],
      legend: ["Knee Angle (°)", "Activation (Rel.)"],
    };
  }, [samples, theme]);

  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  if (!session) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ThemedText style={{ marginBottom: 16 }}>
          {errorMessage ?? "Session not found"}
        </ThemedText>
        <TouchableOpacity
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={[
            styles.doneButton,
            { backgroundColor: theme.primary, width: "60%" },
          ]}
        >
          <ThemedText type="bodyBold" style={{ color: "#fff" }}>
            Go Back
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScreenHeader
        badgeLabel="SESSION SUMMARY"
        onLeftPress={() => router.back()}
        leftAccessibilityLabel="Back"
        leftIcon="chevron.left"
        rightIcon="square.and.arrow.up"
        rightAccessibilityLabel="Share session"
        onRightPress={handleShare}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: theme.warning + "1A",
                borderColor: theme.warning + "40",
              },
            ]}
          >
            <ThemedText style={{ ...Typography.caption, color: theme.warning }}>
              {errorMessage}
            </ThemedText>
          </View>
        ) : null}

        {/* HERO QUALITY CARD */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.cardBackground },
            Shadows.card,
          ]}
        >
          <View
            style={[styles.qualityRing, { borderColor: theme.success + "22" }]}
          >
            <ThemedText style={styles.qualityValue}>
              {Math.round(session.analytics.exerciseQuality * 100)}%
            </ThemedText>
            <ThemedText style={styles.qualityLabel}>QUALITY</ThemedText>
          </View>
          <View style={styles.heroTextContent}>
            <ThemedText type="subtitle" style={styles.exerciseTitle}>
              {exerciseInfo?.name || "General Session"}
            </ThemedText>
            <ThemedText
              style={[styles.sessionDate, { color: theme.textSecondary }]}
            >
              {new Date(session.timestamp).toLocaleDateString([], {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </ThemedText>
            <View
              style={[
                styles.sideBadge,
                { backgroundColor: theme.primary + "15" },
              ]}
            >
              <ThemedText
                type="label"
                style={{
                  color: theme.primary,
                  fontSize: 10,
                }}
              >
                {session.side} LEG
              </ThemedText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.comparisonCard,
            { backgroundColor: theme.secondaryCard, borderColor: theme.border },
          ]}
        >
          <View style={styles.comparisonHeader}>
            <ThemedText type="bodyBold">Progress Comparison</ThemedText>
            <ThemedText
              style={[Typography.caption, { color: theme.textSecondary }]}
            >
              {comparison
                ? "Compared with your last matching session"
                : "No prior session on this exercise yet"}
            </ThemedText>
          </View>
          {comparison ? (
            <View style={styles.comparisonMetrics}>
              <View style={styles.comparisonMetric}>
                <ThemedText
                  style={[
                    styles.comparisonValue,
                    {
                      color:
                        comparison.qualityDelta >= 0
                          ? theme.success
                          : theme.warning,
                    },
                  ]}
                >
                  {comparison.qualityDelta >= 0 ? "+" : ""}
                  {comparison.qualityDelta.toFixed(1)}%
                </ThemedText>
                <ThemedText
                  type="label"
                  style={[
                    styles.comparisonLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Quality
                </ThemedText>
              </View>
              <View style={styles.comparisonMetric}>
                <ThemedText
                  style={[
                    styles.comparisonValue,
                    {
                      color:
                        comparison.romDelta >= 0
                          ? theme.success
                          : theme.warning,
                    },
                  ]}
                >
                  {comparison.romDelta >= 0 ? "+" : ""}
                  {comparison.romDelta.toFixed(1)}°
                </ThemedText>
                <ThemedText
                  type="label"
                  style={[
                    styles.comparisonLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  ROM
                </ThemedText>
              </View>
              <View style={styles.comparisonMetric}>
                <ThemedText
                  style={[styles.comparisonValue, { color: theme.text }]}
                >
                  {comparison.durationDelta >= 0 ? "+" : ""}
                  {comparison.durationDelta.toFixed(0)}s
                </ThemedText>
                <ThemedText
                  type="label"
                  style={[
                    styles.comparisonLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Duration
                </ThemedText>
              </View>
            </View>
          ) : (
            <ThemedText
              style={[
                styles.comparisonFallback,
                { ...Typography.caption, color: theme.textSecondary },
              ]}
            >
              This is your first saved session for this exercise and side.
              Future sessions will show direct progress against this baseline.
            </ThemedText>
          )}
        </View>

        {/* CLINICAL INSIGHTS */}
        <View
          style={[
            styles.insightCard,
            {
              backgroundColor: theme.primary + "08",
              borderColor: theme.primary + "20",
            },
          ]}
        >
          <View style={styles.insightHeader}>
            <IconSymbol name="lightbulb.fill" size={18} color={theme.primary} />
            <ThemedText type="label" style={{ color: theme.primary }}>
              {recommendation?.title ?? "Clinician's Insight"}
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.insightText, { color: theme.textSecondary }]}
          >
            {recommendation?.message}
          </ThemedText>
        </View>

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={styles.row}>
            <StatCard
              label="Duration"
              value={`${Math.floor(session.duration / 60)}m ${session.duration % 60}s`}
            />
            <StatCard
              label="Max Flexion"
              value={`${Math.round(session.analytics.romDegrees)}°`}
            />
          </View>
          <View style={styles.row}>
            <StatCard
              label="Avg. Activation"
              value={`${Math.round(session.analytics.avgActivation * 100)}%`}
            />
            <StatCard
              label="Fatigue Score"
              value={`${Math.round(session.analytics.fatigueScore)}/10`}
            />
          </View>
          <View style={styles.row}>
            <StatCard label="Completion" value={`${completionRate}%`} />
            <StatCard label="Intensity" value={`${intensityScore}/10`} />
          </View>
        </View>

        {/* ACTIVATION GRAPH */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.cardBackground },
            Shadows.card,
          ]}
        >
          <ThemedText type="bodyBold" style={{ marginBottom: 4 }}>
            Session Analytics
          </ThemedText>
          <ThemedText
            style={[
              Typography.caption,
              { color: theme.textSecondary, marginBottom: 24 },
            ]}
          >
            Muscle activation vs. Extension angle
          </ThemedText>

          {chartData ? (
            <LineChart
              data={chartData}
              width={screenWidth - 88}
              height={220}
              chartConfig={{
                backgroundColor: theme.cardBackground,
                backgroundGradientFrom: theme.cardBackground,
                backgroundGradientTo: theme.cardBackground,
                color: (opacity = 1) => theme.textSecondary,
                labelColor: (opacity = 1) => theme.textSecondary,
                strokeWidth: 2,
                decimalPlaces: 0,
                propsForBackgroundLines: {
                  strokeDasharray: "5, 5",
                  strokeOpacity: 0.1,
                },
              }}
              bezier
              style={styles.chart}
              withVerticalLabels={false}
              withDots={false}
              withInnerLines={false}
            />
          ) : (
            <View style={styles.emptyChart}>
              <ThemedText style={{ color: theme.textSecondary }}>
                No graph data available
              </ThemedText>
            </View>
          )}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              <ThemedText style={styles.legendText}>Angle</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.success }]} />
              <ThemedText style={styles.legendText}>Muscle</ThemedText>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.doneButton,
            { backgroundColor: theme.primary, ...Shadows.button },
          ]}
          onPress={() => router.replace("/(tabs)/dashboard" as any)}
        >
          <ThemedText type="bodyBold" style={styles.doneButtonText}>
            Back to Dashboard
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconButton: {
    padding: 8,
  },
  errorBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  heroCard: {
    flexDirection: "row",
    padding: 24,
    borderRadius: 32,
    alignItems: "center",
    gap: 20,
  },
  qualityRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  qualityValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  qualityLabel: {
    fontSize: 9,
    fontWeight: "800",
    opacity: 0.5,
  },
  heroTextContent: {
    flex: 1,
    gap: 4,
  },
  exerciseTitle: {
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 14,
  },
  sideBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 8,
  },
  statsGrid: {
    gap: 16,
  },
  comparisonCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 20,
  },
  comparisonHeader: {
    gap: 4,
  },
  comparisonMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  comparisonMetric: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  comparisonLabel: {
    textTransform: "uppercase",
  },
  comparisonFallback: {
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  chartCard: {
    padding: 24,
    borderRadius: 32,
  },
  chart: {
    marginVertical: 8,
    marginLeft: -16,
  },
  emptyChart: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...Typography.caption,
    fontWeight: "700",
  },
  insightCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  insightText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  doneButton: {
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 8,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 17,
  },
});
