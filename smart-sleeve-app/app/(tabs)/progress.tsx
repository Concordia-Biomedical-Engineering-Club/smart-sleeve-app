import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { ThemedText } from "@/components/themed-text";
import { Colors, Shadows, Typography } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { fetchSessionsByFilters, Session } from "@/services/Database";
import { EXERCISE_LIBRARY } from "@/constants/exercises";
import StatCard from "@/components/StatCard";
import { TrendChart } from "@/components/analytics/TrendChart";
import { RootState } from "@/store/store";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { buildMetricTrend, TimeframeOption } from "@/services/ProgressAnalysis";

type SideFilter = "BOTH" | "LEFT" | "RIGHT";

/**
 * Session Row Item for the history list
 */
function SessionHistoryCard({
  session,
  theme,
}: {
  session: Session;
  theme: any;
}) {
  const router = useRouter();

  const timeStr = useMemo(() => {
    return new Date(session.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [session.timestamp]);

  const exerciseName = useMemo(() => {
    const ex = EXERCISE_LIBRARY.find((e) => e.id === session.exerciseType);
    return ex?.name ?? "General Session";
  }, [session.exerciseType]);

  const qualityColor =
    session.analytics.exerciseQuality > 0.8
      ? "#00A878"
      : session.analytics.exerciseQuality > 0.5
        ? "#F59E0B"
        : "#E63946";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open ${exerciseName} session`}
      style={[
        styles.sessionCard,
        { backgroundColor: theme.cardBackground },
        Shadows.card,
      ]}
      activeOpacity={0.7}
      onPress={() => {
        router.push(`/session-summary/${session.id}`);
      }}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTypeInfo}>
          <View
            style={[
              styles.sideIndicator,
              {
                backgroundColor:
                  session.side === "LEFT" ? "#0B74E6" : "#7C3AED",
              },
            ]}
          >
            <ThemedText style={styles.sideIndicatorText}>
              {session.side[0]}
            </ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.exerciseNameText}>
            {exerciseName}
          </ThemedText>
        </View>
        <ThemedText style={styles.sessionTimeText}>{timeStr}</ThemedText>
      </View>

      <View style={styles.sessionDetails}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>QUALITY</ThemedText>
          <View style={styles.qualityBarBg}>
            <View
              style={[
                styles.qualityBarFill,
                {
                  width: `${session.analytics.exerciseQuality * 100}%`,
                  backgroundColor: qualityColor,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.miniMetric}>
            <IconSymbol name="timer" size={12} color={theme.textSecondary} />
            <ThemedText style={styles.miniMetricText}>
              {Math.floor(session.duration / 60)}m {session.duration % 60}s
            </ThemedText>
          </View>
          <View style={styles.miniMetric}>
            <IconSymbol
              name="flame.fill"
              size={12}
              color={theme.textSecondary}
            />
            <ThemedText style={styles.miniMetricText}>
              {session.analytics.romDegrees.toFixed(0)}° ROM
            </ThemedText>
          </View>
        </View>
      </View>

      <IconSymbol
        name="chevron.right"
        size={16}
        color={theme.border}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

export default function ProgressScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const user = useSelector((state: RootState) => state.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("7D");
  const [selectedSide, setSelectedSide] = useState<SideFilter>("BOTH");
  const [selectedExercise, setSelectedExercise] = useState<string>("ALL");

  const timeframeStart = useMemo(() => {
    const days = timeframe === "7D" ? 7 : timeframe === "30D" ? 30 : 90;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));
    return startDate.getTime();
  }, [timeframe]);

  const loadSessions = async () => {
    try {
      setErrorMessage(null);
      const data = await fetchSessionsByFilters({
        userId: user.email ?? "guest_user",
        exerciseType: selectedExercise === "ALL" ? undefined : selectedExercise,
        side: selectedSide === "BOTH" ? undefined : selectedSide,
        startTimestamp: timeframeStart,
      });
      setSessions(data);
    } catch (e) {
      console.error("Failed to load sessions", e);
      setErrorMessage("Unable to load progress history right now.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [selectedExercise, selectedSide, timeframe, timeframeStart, user.email]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    sessions.forEach((session) => {
      const date = new Date(session.timestamp);
      const today = new Date();
      let dateKey = date.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      if (date.toDateString() === today.toDateString()) {
        dateKey = "Today";
      } else {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
          dateKey = "Yesterday";
        }
      }

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(session);
    });
    return groups;
  }, [sessions]);

  const stats = useMemo(() => {
    if (sessions.length === 0)
      return { avgQuality: 0, totalDuration: 0, maxROM: 0, sessionCount: 0 };
    const totalQuality = sessions.reduce(
      (acc, s) => acc + s.analytics.exerciseQuality,
      0,
    );
    const totalDuration = sessions.reduce((acc, s) => acc + s.duration, 0);
    const maxROM = Math.max(...sessions.map((s) => s.analytics.romDegrees));

    return {
      avgQuality: Math.round((totalQuality / sessions.length) * 100),
      totalDuration: Math.round(totalDuration / 60),
      maxROM: Math.round(maxROM),
      sessionCount: sessions.length,
    };
  }, [sessions]);

  const romTrendData = useMemo(() => {
    if (sessions.length === 0) return null;
    const trend = buildMetricTrend(sessions, timeframe, "romDegrees");
    return {
      labels: trend.labels,
      datasets: [
        {
          data: trend.values,
          color: () => theme.primary,
          strokeWidth: 2,
        },
      ],
      legend: ["ROM (°)"],
    };
  }, [sessions, theme.primary, timeframe]);

  const qualityTrendData = useMemo(() => {
    if (sessions.length === 0) return null;
    const trend = buildMetricTrend(sessions, timeframe, "exerciseQuality");
    return {
      labels: trend.labels,
      datasets: [
        {
          data: trend.values,
          color: () => theme.success,
          strokeWidth: 2,
        },
      ],
      legend: ["Quality (%)"],
    };
  }, [sessions, theme.success, timeframe]);

  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText style={Typography.heading1}>Progress Log</ThemedText>
          <TouchableOpacity onPress={onRefresh} style={styles.syncButton}>
            <IconSymbol
              name="arrow.triangle.2.circlepath"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

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
            <ThemedText style={{ color: theme.warning }}>
              {errorMessage}
            </ThemedText>
          </View>
        ) : null}

        <View
          style={[
            styles.filterCard,
            { backgroundColor: theme.cardBackground },
            Shadows.card,
          ]}
        >
          <ThemedText type="defaultSemiBold" style={styles.filterTitle}>
            Timeframe
          </ThemedText>
          <SegmentedControl
            options={["7D", "30D", "90D"]}
            selectedOption={timeframe}
            onSelect={(option) => setTimeframe(option as TimeframeOption)}
          />

          <ThemedText type="defaultSemiBold" style={styles.filterTitle}>
            Side
          </ThemedText>
          <SegmentedControl
            options={["Both", "Left", "Right"]}
            selectedOption={
              selectedSide === "BOTH"
                ? "Both"
                : selectedSide === "LEFT"
                  ? "Left"
                  : "Right"
            }
            onSelect={(option) => {
              setSelectedSide(
                option === "Both"
                  ? "BOTH"
                  : option === "Left"
                    ? "LEFT"
                    : "RIGHT",
              );
            }}
          />

          <ThemedText type="defaultSemiBold" style={styles.filterTitle}>
            Exercise
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.exerciseChipRow}
          >
            {["ALL", ...EXERCISE_LIBRARY.map((exercise) => exercise.id)].map(
              (exerciseId) => {
                const isSelected = selectedExercise === exerciseId;
                const label =
                  exerciseId === "ALL"
                    ? "All Exercises"
                    : (EXERCISE_LIBRARY.find(
                        (exercise) => exercise.id === exerciseId,
                      )?.name ?? exerciseId);

                return (
                  <TouchableOpacity
                    key={exerciseId}
                    accessibilityRole="button"
                    onPress={() => setSelectedExercise(exerciseId)}
                    style={[
                      styles.exerciseChip,
                      {
                        backgroundColor: isSelected
                          ? theme.tint
                          : theme.background,
                        borderColor: isSelected ? theme.tint : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected ? "#fff" : theme.text,
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </ScrollView>
        </View>

        {/* ANALYTICS SNAPSHOT */}
        <View style={styles.statsContainer}>
          <View style={styles.row}>
            <StatCard
              label="Quality"
              value={`${stats.avgQuality}%`}
              image={require("@/assets/images/target.png")}
              imageStyle={{
                width: 60,
                height: 60,
                bottom: -5,
                right: -5,
                opacity: 0.2,
              }}
            />
            <StatCard
              label="Sessions"
              value={stats.sessionCount.toString()}
              image={require("@/assets/images/fire.png")}
              imageStyle={{
                width: 60,
                height: 60,
                bottom: -5,
                right: -5,
                opacity: 0.2,
              }}
            />
          </View>
          <View style={styles.row}>
            <StatCard
              label="Min Trained"
              value={stats.totalDuration.toString()}
              image={require("@/assets/images/woman.png")}
              imageStyle={{
                width: 60,
                height: 60,
                bottom: -5,
                right: -5,
                opacity: 0.2,
              }}
            />
            <StatCard
              label="Peak ROM"
              value={`${stats.maxROM}°`}
              image={require("@/assets/images/trophy.png")}
              imageStyle={{
                width: 60,
                height: 60,
                bottom: -5,
                right: -5,
                opacity: 0.2,
              }}
            />
          </View>
        </View>

        {/* TREND CHART */}
        {romTrendData && qualityTrendData ? (
          <>
            <View style={styles.chartWrapper}>
              <TrendChart
                data={romTrendData}
                title="Range of Motion"
                subtitle={`Peak ROM across the last ${timeframe.replace("D", "")} days`}
                height={220}
              />
            </View>
            <View style={styles.chartWrapper}>
              <TrendChart
                data={qualityTrendData}
                title="Quality Trend"
                subtitle={`Average movement quality across the last ${timeframe.replace("D", "")} days`}
                height={220}
              />
            </View>
          </>
        ) : null}

        {/* RECENT ACTIVITY LIST */}
        <View style={styles.historyContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Activity
          </ThemedText>

          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                name="clipboard.fill"
                size={64}
                color={theme.border}
              />
              <ThemedText style={styles.emptyTitle}>No Sessions Yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Start your first guided exercise on the Dashboard to see your
                progress here.
              </ThemedText>
            </View>
          ) : (
            Object.keys(groupedSessions).map((dateKey) => (
              <View key={dateKey} style={styles.dateGroup}>
                <ThemedText style={styles.dateHeader}>{dateKey}</ThemedText>
                {groupedSessions[dateKey].map((session) => (
                  <SessionHistoryCard
                    key={session.id}
                    session={session}
                    theme={theme}
                  />
                ))}
              </View>
            ))
          )}
        </View>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  syncButton: {
    padding: 8,
  },
  errorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  filterCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  filterTitle: {
    marginBottom: 10,
  },
  exerciseChipRow: {
    gap: 10,
    paddingRight: 8,
  },
  exerciseChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  chartWrapper: {
    marginBottom: 32,
  },
  historyContainer: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 16,
    marginLeft: 4,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  sessionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    position: "relative",
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sessionTypeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sideIndicator: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sideIndicatorText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  exerciseNameText: {
    fontSize: 16,
  },
  sessionTimeText: {
    fontSize: 12,
    opacity: 0.5,
  },
  sessionDetails: {
    gap: 12,
  },
  statItem: {
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.4,
    letterSpacing: 1,
  },
  qualityBarBg: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  qualityBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  metricRow: {
    flexDirection: "row",
    gap: 16,
  },
  miniMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniMetricText: {
    fontSize: 12,
    opacity: 0.7,
  },
  chevron: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    opacity: 0.8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.5,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
