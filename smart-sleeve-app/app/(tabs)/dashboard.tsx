import React, { useState } from "react";
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
import {
  selectIsCalibrated,
  selectShowNormalized,
  toggleNormalizedMode,
  setCalibration,
  selectInjuredSide,
} from "../../store/userSlice";
import type { CalibrationCoefficients } from "../../store/userSlice";
import { RootState } from "../../store/store";
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

import { ScreenHeader } from "@/components/ui/ScreenHeader";

const getChannels = (injuredSide: "LEFT" | "RIGHT" | null, theme: any) => {
  const isLeftInjured = (injuredSide ?? "LEFT") === "LEFT";
  const injured = (name: string) => `${name} (Injured)`;
  const healthy = (name: string) => `${name} (Healthy)`;
  return [
    {
      id: 0,
      label: isLeftInjured ? injured("VMO") : healthy("VMO"),
      color: theme.primary,
    },
    {
      id: 1,
      label: isLeftInjured ? injured("VL") : healthy("VL"),
      color: "#FF6B6B",
    },
    {
      id: 2,
      label: isLeftInjured
        ? injured("Semitendinosus")
        : healthy("Semitendinosus"),
      color: "#4ECDC4",
    },
    {
      id: 3,
      label: isLeftInjured
        ? injured("Biceps Femoris")
        : healthy("Biceps Femoris"),
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
  const latestFeatures = useSelector(
    (state: RootState) => state.device.latestFeatures,
  );
  const injuredSide = useSelector(selectInjuredSide);

  const [showCalibration, setShowCalibration] = useState(false);

  const currentKneeAngle =
    kneeAngleBuffer.length > 0
      ? Math.round(kneeAngleBuffer[kneeAngleBuffer.length - 1])
      : 0;

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [timeframe, setTimeframe] = useState("Daily");

  const userName = user?.email ? user.email.split("@")[0] : "Athlete";
  const channels = getChannels(injuredSide, theme);

  const handleCalibrationComplete = (coeffs: CalibrationCoefficients) => {
    dispatch(setCalibration(coeffs));
    setShowCalibration(false);
  };

  const handleToggleNormalized = () => {
    dispatch(toggleNormalizedMode());
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

  const liveRMS = latestFeatures?.rms ?? [];

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
                REHABBING: {injuredSide === "LEFT" ? "Left" : "Right"} Knee
              </ThemedText>
            )}
            <View style={{ marginTop: 24 }}>
              <SegmentedControl
                options={["Daily", "Weekly", "Monthly"]}
                selectedOption={timeframe}
                onSelect={setTimeframe}
              />
            </View>
          </View>
        ) : (
          <View style={styles.workoutHudHeader}>
            <WorkoutOverlay />
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
              {isCalibrated ? "Calibrated" : "Calibrate Sensors"}
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
                {showNormalized ? "% MVC" : "μV"}
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
                Start Rehab Session
              </ThemedText>
              <ThemedText
                style={[
                  styles.actionSubtitle,
                  { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                Follow clinical exercise library
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
                  {showNormalized ? "NORMALIZED" : "RAW MV"}
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

        {!isWorkoutActive && (
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <StatCard value="-1°" label="Extension Deficit" />
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
        liveRMS={liveRMS}
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
