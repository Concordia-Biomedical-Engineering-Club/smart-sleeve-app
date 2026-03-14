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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { ThemedText } from "@/components/themed-text";
import { Colors, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { fetchSessionsByFilters, Session } from "@/services/Database";
import { EXERCISE_LIBRARY } from "@/constants/exercises";
import StatCard from "@/components/StatCard";
import { RootState } from "@/store/store";
import { selectSyncStatus, selectLastSyncedAt } from "@/store/userSlice";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { buildMetricTrend, TimeframeOption } from "@/services/ProgressAnalysis";
import { TrendChart } from "@/components/analytics/TrendChart";

import { ScreenHeader } from "@/components/ui/ScreenHeader";

type SideFilter = "BOTH" | "LEFT" | "RIGHT";

async function triggerSyncNow(uid: string, legacyEmail?: string | null) {
  const { syncNow } = await import("@/services/SyncService");
  return syncNow(uid, legacyEmail);
}

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
          <ThemedText type="bodyBold" style={styles.exerciseNameText}>
            {exerciseName}
          </ThemedText>
          {/* Per-Session Sync Badge */}
          <View style={styles.rowSyncBadge}>
            <IconSymbol
              name={
                session.synced ? "checkmark.icloud.fill" : "arrow.up.doc.fill"
              }
              size={12}
              color={session.synced ? theme.success : theme.textSecondary}
            />
          </View>
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

  const syncStatus = useSelector(selectSyncStatus);
  const lastSyncedAt = useSelector(selectLastSyncedAt);

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

  const loadSessions = React.useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await fetchSessionsByFilters({
        userId: user.uid ?? user.email ?? "guest_user",
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
  }, [selectedExercise, selectedSide, timeframeStart, user.email, user.uid]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onRefresh = async () => {
    setRefreshing(true);

    // First trigger a cloud sync if authenticated
    if (user.uid) {
      await triggerSyncNow(user.uid, user.email).catch(console.error);
    }

    // Then reload local DB
    await loadSessions();
  };

  const lastSyncedLabel = useMemo(() => {
    if (!lastSyncedAt) return null;
    return new Date(lastSyncedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastSyncedAt]);

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
        <ActivityIndicator size="large" color={theme.primary} />
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
            tintColor={theme.primary}
          />
        }
      >
        {/* Sync Status Badge Container */}
        <View style={styles.headerTopArea}>
          {syncStatus === "syncing" ? (
            <View
              style={[
                styles.syncBadge,
                { backgroundColor: theme.primary + "1A" },
              ]}
            >
              <ActivityIndicator
                size="small"
                color={theme.primary}
                style={{ transform: [{ scale: 0.7 }] }}
              />
              <Text style={[styles.syncText, { color: theme.primary }]}>
                Syncing
              </Text>
            </View>
          ) : syncStatus === "synced" ? (
            <View
              style={[
                styles.syncBadge,
                { backgroundColor: theme.success + "1A" },
              ]}
            >
              <IconSymbol
                name="checkmark.icloud.fill"
                size={12}
                color={theme.success}
              />
              <Text style={[styles.syncText, { color: theme.success }]}>
                Cloud Backup Active
              </Text>
            </View>
          ) : syncStatus === "error" ? (
            <View
              style={[
                styles.syncBadge,
                { backgroundColor: theme.warning + "1A" },
              ]}
            >
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={12}
                color={theme.warning}
              />
              <Text style={[styles.syncText, { color: theme.warning }]}>
                Sync Failed
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.syncBadge,
                { backgroundColor: theme.textSecondary + "1A" },
              ]}
            >
              <IconSymbol
                name="cloud.fill"
                size={12}
                color={theme.textSecondary}
              />
              <Text style={[styles.syncText, { color: theme.textSecondary }]}>
                Local Storage
              </Text>
            </View>
          )}
        </View>
        {lastSyncedLabel ? (
          <Text style={[styles.lastSyncedText, { color: theme.textSecondary }]}>
            Last synced {lastSyncedLabel}
          </Text>
        ) : null}

        <ScreenHeader
          badgeLabel="SESSION HISTORY"
          rightIcon="arrow.triangle.2.circlepath"
          onRightPress={onRefresh}
        />

        <ThemedText type="title" style={styles.pageTitle}>
          Progress Log
        </ThemedText>

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
            { backgroundColor: theme.secondaryCard, borderColor: theme.border },
          ]}
        >
          <ThemedText
            type="label"
            style={[styles.filterTitle, { color: theme.textSecondary }]}
          >
            Filters
          </ThemedText>

          <SegmentedControl
            options={["7D", "30D", "90D"]}
            selectedOption={timeframe}
            onSelect={(option) => setTimeframe(option as TimeframeOption)}
          />

          <View style={{ height: 12 }} />

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

          <View style={{ height: 16 }} />

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
                          ? theme.primary
                          : theme.background,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                      isSelected && Shadows.button,
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected ? "#fff" : theme.textSecondary,
                        fontSize: 12,
                        fontWeight: "700",
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
            <StatCard label="Avg Quality" value={`${stats.avgQuality}%`} />
            <StatCard
              label="Total Sessions"
              value={stats.sessionCount.toString()}
            />
          </View>
          <View style={styles.row}>
            <StatCard
              label="Mins Trained"
              value={stats.totalDuration.toString()}
            />
            <StatCard label="Peak ROM" value={`${stats.maxROM}°`} />
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
          <ThemedText
            type="label"
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
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
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  headerTopArea: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  lastSyncedText: {
    fontSize: 11,
    textAlign: "right",
    marginTop: -10,
    marginBottom: 16,
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pageTitle: { marginBottom: 24 },
  errorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  filterCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
  },
  filterTitle: {
    marginBottom: 16,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  exerciseChipRow: { gap: 10, paddingRight: 8 },
  exerciseChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statsContainer: { marginBottom: 32, gap: 16 },
  row: { flexDirection: "row", gap: 16 },
  chartWrapper: { marginBottom: 32 },
  historyContainer: { flex: 1 },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  dateGroup: { marginBottom: 24 },
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
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sessionTypeInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  sideIndicator: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sideIndicatorText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  exerciseNameText: { fontSize: 17 },
  rowSyncBadge: {
    marginLeft: 4,
    opacity: 0.8,
  },
  sessionTimeText: { fontSize: 12, opacity: 0.5 },
  sessionDetails: { gap: 16 },
  statItem: { gap: 8 },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.4,
    letterSpacing: 1,
  },
  qualityBarBg: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  qualityBarFill: { height: "100%", borderRadius: 4 },
  metricRow: { flexDirection: "row", gap: 20 },
  miniMetric: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniMetricText: { fontSize: 13, opacity: 0.7, fontWeight: "600" },
  chevron: { position: "absolute", right: 20, top: "50%", marginTop: 10 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", opacity: 0.8 },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.5,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
