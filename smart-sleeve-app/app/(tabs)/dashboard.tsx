import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";
import {
  selectKneeAngleBuffer,
  selectIsWorkoutActive,
  selectWorkout,
} from "../../store/deviceSlice";
import { fetchSessionsByFilters } from "@/services/Database";
import {
  findLatestBilateralComparison,
  type BilateralComparisonResult,
} from "@/services/SymmetryService";
import {
  selectIsCalibrated,
  selectShowNormalized,
  toggleNormalizedMode,
  setCalibration,
  selectInjuredSide,
  selectMeasurementSide,
  setMeasurementSide,
} from "../../store/userSlice";
import type {
  CalibrationCoefficients,
  InjuredSide,
} from "../../store/userSlice";
import type { RootState } from "../../store/store";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Shadows } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { CircularDataCard } from "@/components/dashboard/CircularDataCard";
import StatCard from "@/components/StatCard";
import { RMSGraph } from "@/components/dashboard/RMSGraph";
import { EXERCISE_LIBRARY } from "@/constants/exercises";
import { WorkoutOverlay } from "@/components/dashboard/WorkoutOverlay";
import CalibrationOverlay from "@/components/dashboard/CalibrationOverlay";
import {
  getSignalBadgeLabel,
  getSignalToggleLabel,
} from "@/components/dashboard/signalDisplay";
import SymmetryCard from "@/components/dashboard/SymmetryCard";

import { ScreenHeader } from "@/components/ui/ScreenHeader";

const getChannels = (theme: any) => {
  return [
    {
      id: 0,
      label: "VMO (Stabilizer)",
      color: theme.primary,
    },
    {
      id: 1,
      label: "VL (Prime Mover)",
      color: "#FF6B6B",
    },
    {
      id: 2,
      label: "ST (Inner Hamstring)",
      color: "#4ECDC4",
    },
    {
      id: 3,
      label: "BF (Outer Hamstring)",
      color: "#FFE66D",
    },
  ];
};

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  const kneeAngleBuffer = useSelector(selectKneeAngleBuffer);
  const isWorkoutActive = useSelector(selectIsWorkoutActive);
  const workout = useSelector(selectWorkout);
  const isCalibrated = useSelector(selectIsCalibrated);
  const showNormalized = useSelector(selectShowNormalized);
  const latestCalibrationSample = useSelector(
    (state: RootState) => state.device.latestCalibrationSample,
  );
  const injuredSide = useSelector(selectInjuredSide);
  const measurementSide = useSelector(selectMeasurementSide);

  const [showCalibration, setShowCalibration] = useState(false);
  const [comparison, setComparison] =
    useState<BilateralComparisonResult | null>(null);

  const currentKneeAngle =
    kneeAngleBuffer.length > 0
      ? Math.round(kneeAngleBuffer[kneeAngleBuffer.length - 1])
      : 0;

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const userName = user?.email ? user.email.split("@")[0] : "Athlete";
  const channels = getChannels(theme);
  const healthySide = injuredSide === "LEFT" ? "RIGHT" : "LEFT";
  const measurementOptions: { label: string; side: InjuredSide }[] = injuredSide
    ? [
        {
          label: injuredSide === "LEFT" ? "Injured Left" : "Injured Right",
          side: injuredSide,
        },
        {
          label: healthySide === "LEFT" ? "Healthy Left" : "Healthy Right",
          side: healthySide,
        },
      ]
    : [
        { label: "Left Leg", side: "LEFT" as const },
        { label: "Right Leg", side: "RIGHT" as const },
      ];
  const selectedMeasurementLabel =
    measurementOptions.find((option) => option.side === measurementSide)
      ?.label ?? "Left Leg";

  useEffect(() => {
    let isActive = true;

    async function loadComparison() {
      if (!injuredSide) {
        if (isActive) setComparison(null);
        return;
      }

      try {
        const sessions = await fetchSessionsByFilters({
          userId: user.uid ?? user.email ?? "guest_user",
        });

        if (!isActive) return;
        setComparison(findLatestBilateralComparison(sessions, injuredSide));
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to load bilateral comparison", error);
        setComparison(null);
      }
    }

    void loadComparison();

    return () => {
      isActive = false;
    };
  }, [injuredSide, isWorkoutActive, user.email, user.uid]);

  const handleCalibrationComplete = (coeffs: CalibrationCoefficients) => {
    dispatch(setCalibration(coeffs));
    setShowCalibration(false);
  };

  const handleToggleNormalized = () => {
    dispatch(toggleNormalizedMode());
  };

  const handleMeasurementSideChange = (optionLabel: string) => {
    const option = measurementOptions.find(
      (item) => item.label === optionLabel,
    );
    if (!option) return;
    dispatch(setMeasurementSide(option.side));
  };

  const sortedChannels = React.useMemo(() => {
    if (!isWorkoutActive || !workout.exerciseId) return channels;
    const exerciseData = EXERCISE_LIBRARY.find(
      (ex) => ex.id === workout.exerciseId,
    );
    if (!exerciseData) return channels;
    const primaries = channels.filter((c) =>
      exerciseData.primaryChannels.includes(c.id),
    );
    const secondaries = channels.filter(
      (c) => !exerciseData.primaryChannels.includes(c.id),
    );
    return [...primaries, ...secondaries];
  }, [isWorkoutActive, workout.exerciseId, channels]);

  const liveCalibrationSample = latestCalibrationSample ?? [];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isWorkoutActive ? (
          <View style={styles.headerContainer}>
            <ScreenHeader
              badgeLabel="REHAB CO-PILOT"
              onRightPress={() => console.log("Notification")}
              rightIcon="bell.fill"
            />
            <ThemedText type="title" style={styles.greeting}>
              Hey {userName}!
            </ThemedText>
            {injuredSide && (
              <ThemedText
                style={[styles.sideLabel, { color: theme.textSecondary }]}
              >
                RECOVERY TARGET: {injuredSide === "LEFT" ? "Left" : "Right"}{" "}
                Knee
              </ThemedText>
            )}
          </View>
        ) : (
          <View style={styles.workoutHudHeader}>
            <WorkoutOverlay />
          </View>
        )}

        {!isWorkoutActive && (
          <View style={styles.measurementSection}>
            <ThemedText
              type="label"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              Measuring Today
            </ThemedText>
            <SegmentedControl
              options={measurementOptions.map((option) => option.label)}
              selectedOption={selectedMeasurementLabel}
              onSelect={handleMeasurementSideChange}
            />
          </View>
        )}

        <View style={styles.calibrationRow}>
          <TouchableOpacity
            style={[
              styles.calibrateBtn,
              {
                backgroundColor: theme.primary + "10",
                borderColor: theme.primary,
              },
            ]}
            onPress={() => setShowCalibration(true)}
          >
            <IconSymbol name="waveform" size={16} color={theme.primary} />
            <ThemedText
              style={[styles.calibrateBtnText, { color: theme.primary }]}
            >
              {isCalibrated
                ? `Recalibrate ${selectedMeasurementLabel}`
                : `Calibrate ${selectedMeasurementLabel}`}
            </ThemedText>
          </TouchableOpacity>

          {isCalibrated && (
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: showNormalized
                    ? theme.primary
                    : theme.secondaryCard,
                  borderColor: theme.border,
                },
              ]}
              onPress={handleToggleNormalized}
            >
              <ThemedText
                style={[
                  styles.toggleBtnText,
                  { color: showNormalized ? "#fff" : theme.textSecondary },
                ]}
              >
                {getSignalToggleLabel(showNormalized)}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {!isWorkoutActive && (
          <TouchableOpacity
            style={[
              styles.libraryAction,
              { backgroundColor: theme.primary, ...Shadows.button },
            ]}
            onPress={() => router.push("/(tabs)/exercises")}
          >
            <View style={styles.actionTextContainer}>
              <ThemedText style={[styles.actionTitle, { color: "#fff" }]}>
                Start Measurement Session
              </ThemedText>
              <ThemedText
                style={[
                  styles.actionSubtitle,
                  { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                Record the healthy or injured leg with the same protocol
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <CircularDataCard
          title="Flexion Range of Motion"
          currentValue={`${currentKneeAngle}°`}
          goalValue="Target: 120°"
          percentage={(currentKneeAngle / 120) * 100}
        />

        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <ThemedText
              type="label"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              Live Muscle Activation
            </ThemedText>
            {isCalibrated && (
              <View style={[styles.pill, { backgroundColor: theme.border }]}>
                <ThemedText style={styles.unitLabel}>
                  {getSignalBadgeLabel(showNormalized)}
                </ThemedText>
              </View>
            )}
          </View>

          {sortedChannels.map((channel) => {
            const isPrimary =
              isWorkoutActive &&
              EXERCISE_LIBRARY.find(
                (ex) => ex.id === workout.exerciseId,
              )?.primaryChannels.includes(channel.id);
            const graphHeight = isWorkoutActive && !isPrimary ? 80 : 120;
            return (
              <RMSGraph
                key={channel.id}
                channelIndex={channel.id}
                label={channel.label}
                lineColor={channel.color}
                height={graphHeight}
              />
            );
          })}
        </View>

        {!isWorkoutActive && injuredSide && (
          <View style={styles.sectionTitleRow}>
            <ThemedText
              type="label"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              Healthy vs Injured Comparison
            </ThemedText>
          </View>
        )}

        {!isWorkoutActive && comparison && (
          <SymmetryCard comparison={comparison} />
        )}

        {!isWorkoutActive && injuredSide && !comparison && (
          <View
            style={[
              styles.comparisonHintCard,
              {
                backgroundColor: theme.secondaryCard,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText type="bodyBold" style={{ color: theme.text }}>
              Symmetry Score appears after both legs are recorded.
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>
              Complete one calibrated session on the healthy leg and one on the
              injured leg for the same exercise. The comparison card will appear
              here on the Dashboard.
            </ThemedText>
          </View>
        )}

        {!isWorkoutActive && (
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <StatCard value="-1°" label="Leg Extension Gap" />
              <StatCard value="12 Days" label="Rehab Streak" />
            </View>
            <View style={styles.gridRow}>
              <StatCard value="5/6" label="Today's Exercises" />
              <StatCard value="Mild" label="Clinical Fatigue" />
            </View>
          </View>
        )}
      </ScrollView>

      <CalibrationOverlay
        visible={showCalibration}
        liveSample={liveCalibrationSample}
        onComplete={handleCalibrationComplete}
        onDismiss={() => setShowCalibration(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContent: { padding: 24, paddingBottom: 40 },
  headerContainer: { marginBottom: 32 },
  greeting: { marginBottom: 4 },
  sideLabel: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5 },
  calibrationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  measurementSection: { gap: 12, marginBottom: 20 },
  calibrateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  calibrateBtnText: { fontSize: 14, fontWeight: "700" },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleBtnText: { fontSize: 13, fontWeight: "700" },
  sectionContainer: { marginVertical: 24 },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  unitLabel: { fontSize: 9, fontWeight: "800", color: "#64748B" },
  comparisonHintCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 8,
    marginBottom: 16,
  },
  gridContainer: { gap: 16, marginTop: 12 },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 16,
  },
  libraryAction: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    justifyContent: "space-between",
  },
  actionTextContainer: { gap: 4 },
  actionTitle: { fontSize: 18, fontWeight: "700" },
  actionSubtitle: { fontSize: 14 },
  workoutHudHeader: { marginBottom: 0, backgroundColor: "transparent" },
});
