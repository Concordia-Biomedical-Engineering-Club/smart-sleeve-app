import React, { useMemo, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  View,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/hooks/storeHooks";
import {
  cancelWorkout,
  completeWorkout,
  selectWorkoutPhase,
  sessionSaveFailed,
  selectLatestFeatures,
} from "@/store/deviceSlice";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";
import { EXERCISE_LIBRARY } from "@/constants/exercises";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Shadows, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const PHASE_CONFIG = {
  IDLE: { label: "", colorKey: "transparent", emoji: "" },
  COUNTDOWN: { label: "Get Ready…", colorKey: "warning", emoji: "⏳" },
  ACTIVE_WORK: { label: "FLEX NOW", colorKey: "success", emoji: "💪" },
  ACTIVE_REST: { label: "RELAX", colorKey: "primary", emoji: "😮‍💨" },
  COMPLETING: { label: "Session Complete!", colorKey: "primary", emoji: "🏆" },
};

/**
 * Modular Sub-Component: Phase Instructional Banner
 * Combined Phase, Timer, and Rep Progress to maximize screen space.
 */
function PhaseBanner({
  phase,
  config,
  phaseColor,
  workout,
  theme,
}: {
  phase: string;
  config: any;
  phaseColor: string;
  workout: any;
  theme: any;
}) {
  const isWork = phase === "ACTIVE_WORK";
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isWork) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = 1;
    }
  }, [isWork, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: phaseColor,
  }));

  const progress =
    workout.totalReps > 0
      ? (workout.currentRep - (phase === "ACTIVE_WORK" ? 0 : 1)) /
        workout.totalReps
      : 0;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <Animated.View
      style={[
        styles.phaseCard,
        { backgroundColor: theme.cardBackground + "F2" },
        Shadows.card,
        animatedStyle,
      ]}
    >
      <View style={styles.phaseTopRow}>
        <ThemedText style={styles.phaseEmoji}>{config.emoji}</ThemedText>
        <View style={styles.phaseTextContent}>
          <ThemedText style={[styles.phaseLabel, { color: phaseColor }]}>
            {config.label}
          </ThemedText>
          {phase !== "COMPLETING" && (
            <ThemedText type="bodyBold" style={{ color: theme.textSecondary }}>
              {workout.phaseSecondsRemaining}s remain
            </ThemedText>
          )}
        </View>
        {(phase === "ACTIVE_WORK" || phase === "ACTIVE_REST") && (
          <View style={styles.repBadge}>
            <ThemedText style={styles.repBadgeText}>
              REP {workout.currentRep}/{workout.totalReps}
            </ThemedText>
          </View>
        )}
      </View>

      {workout.totalReps > 0 &&
        phase !== "COUNTDOWN" &&
        phase !== "COMPLETING" && (
          <View
            style={[styles.miniProgressBg, { backgroundColor: theme.border }]}
          >
            <View
              style={[
                styles.miniProgressFill,
                {
                  width: `${clampedProgress * 100}%`,
                  backgroundColor: phaseColor,
                },
              ]}
            />
          </View>
        )}
    </Animated.View>
  );
}

/**
 * Modular Sub-Component: Coaching Cue Card
 */
function CoachingCard({
  tip,
  theme,
  phaseColor,
}: {
  tip: string;
  theme: any;
  phaseColor: string;
}) {
  return (
    <ThemedView
      style={[
        styles.cueCard,
        {
          borderLeftColor: phaseColor,
          backgroundColor: theme.cardBackground + "F2",
        },
        Shadows.card,
      ]}
    >
      <ThemedText style={[styles.cueLabel, { color: theme.textSecondary }]}>
        FORM TIP
      </ThemedText>
      <ThemedText
        type="bodyBold"
        style={{ color: theme.text, fontStyle: "italic", fontSize: 15 }}
      >
        {tip}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * Modular Sub-Component: Muscle Harmony / Firing Index
 */
function HarmonyIndicator({ theme }: { theme: any }) {
  const latestFeatures = useAppSelector(selectLatestFeatures);
  const phase = useAppSelector(selectWorkoutPhase);
  const workout = useWorkoutTimer();

  const activeExercise = useMemo(() => {
    return EXERCISE_LIBRARY.find((ex) => ex.id === workout.exerciseId);
  }, [workout.exerciseId]);

  const harmonyData = useMemo(() => {
    if (!latestFeatures || phase !== "ACTIVE_WORK") return null;

    // We assume Sensor 1 is m1 and Sensor 2 is m2
    // If the athlete is doing Quads, it's VMO vs VL
    // If Hamstrings, it's ST vs BF
    const m1 = latestFeatures.rms[0] ?? 0;
    const m2 = latestFeatures.rms[1] ?? 0;

    if (m1 < 0.05 && m2 < 0.05) return null;

    const ratio = m1 / Math.max(0.01, m2);

    let status: "PERFECT" | "BALANCED" | "LAGGING" = "LAGGING";
    if (ratio >= 0.9 && ratio <= 1.2) status = "PERFECT";
    else if (ratio >= 0.6 && ratio <= 1.5) status = "BALANCED";

    const isHamstring = activeExercise?.focus.includes("Hamstring");
    const pairLabel = isHamstring ? "ST (Medial) vs BF (Lateral)" : "VMO (Stabilizer) vs VL (Prime)";

    return { status, pairLabel };
  }, [latestFeatures, phase, activeExercise]);

  if (!harmonyData) return null;

  const config = {
    PERFECT: { label: "Perfect Harmony", color: theme.success, emoji: "✨", detail: "Muscles firing in sync" },
    BALANCED: { label: "Functional Balance", color: theme.primary, emoji: "👍", detail: "Good symmetry maintained" },
    LAGGING: { label: "Delay Detected", color: theme.warning, emoji: "⚠️", detail: "Focus on even activation" },
  }[harmonyData.status];

  return (
    <ThemedView
      style={[
        styles.harmonyCard,
        {
          borderColor: config.color,
          backgroundColor: theme.cardBackground + "F2",
        },
        Shadows.card,
      ]}
    >
      <View style={[styles.harmonyDot, { backgroundColor: config.color }]} />
      <View style={styles.harmonyTextGroup}>
        <ThemedText style={[styles.harmonyLabel, { color: config.color }]}>
          {config.label} {config.emoji}
        </ThemedText>
        <ThemedText style={styles.harmonyValue}>
          {harmonyData.pairLabel} • {config.detail}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export function WorkoutOverlay() {
  const dispatch = useAppDispatch();
  const phase = useAppSelector(selectWorkoutPhase);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const user = useAppSelector((state) => state.user);

  const { endAndSave, sessionStatus } = useWorkoutSession();
  const workout = useWorkoutTimer();

  const activeExerciseData = useMemo(() => {
    return EXERCISE_LIBRARY.find((ex) => ex.id === workout.exerciseId);
  }, [workout.exerciseId]);

  const handleFinishSession = async () => {
    try {
      // 1. Save to SQLite via our orchestrated hook
      const userId = user.email || "guest_user";
      const result = await endAndSave(userId);
      console.log(`[WorkoutOverlay] endAndSave result:`, result);

      const sessionId = result?.sessionId;

      // 2. Clear UI state
      dispatch(completeWorkout());

      // 3. Navigate to Summary or show Web Alert
      if (Platform.OS === "web") {
        Alert.alert(
          "Session Completed",
          "Web Demo: Your session finished, but data is only saved/synced when using the real iOS or Android app.",
        );
      } else if (sessionId) {
        router.push(`/session-summary/${sessionId}`);
      } else {
        Alert.alert("Session Saved", `Your workout was stored locally.`);
      }
    } catch (e: any) {
      console.error("Save failed", e);
      Alert.alert("Save Error", "We couldn't save your workout data locally.");
      dispatch(completeWorkout()); // still finish the UI even if save fails for now
    }
  };

  const handleCancel = () => {
    // If we cancel, we reset the session recording without saving
    dispatch(sessionSaveFailed());
    dispatch(cancelWorkout());
  };

  if (phase === "IDLE") return null;

  const config = PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG];
  const phaseColor = theme[config.colorKey as keyof typeof theme] as string;

  const isLeft = workout.targetSide === "LEFT";
  const isRight = workout.targetSide === "RIGHT";

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* COMPACT TOP HUD */}
      <View style={styles.hudTopSection}>
        <View style={styles.exerciseHeader}>
          <ThemedText
            type="bodyBold"
            style={{ color: theme.text, opacity: 0.8 }}
          >
            {workout.exerciseName ?? "Exercise"}
          </ThemedText>
          {(isLeft || isRight) && (
            <View
              style={[
                styles.sideBadge,
                { backgroundColor: theme.primary + "26" },
              ]}
            >
              <ThemedText
                style={[styles.sideBadgeText, { color: theme.primary }]}
              >
                {isLeft ? "L" : "R"}
              </ThemedText>
            </View>
          )}
        </View>

        <PhaseBanner
          phase={phase}
          config={config}
          phaseColor={phaseColor}
          workout={workout}
          theme={theme}
        />

        <HarmonyIndicator theme={theme} />
      </View>

      {/* BOTTOM CONTROL / COACHING ZONE */}
      <View style={styles.hudBottomSection}>
        {(phase === "ACTIVE_WORK" || phase === "ACTIVE_REST") &&
          activeExerciseData?.formTip && (
            <CoachingCard
              tip={activeExerciseData.formTip}
              theme={theme}
              phaseColor={phaseColor}
            />
          )}

        {phase === "COMPLETING" && (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.cardBackground + "F2" },
              Shadows.card,
            ]}
          >
            <ThemedText type="subtitle">Great Job!</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>
              Completed {workout.totalReps} Reps
            </ThemedText>
          </View>
        )}

        <View style={styles.actionRow}>
          {phase === "COMPLETING" ? (
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: phaseColor }]}
              onPress={handleFinishSession}
              disabled={sessionStatus === "SAVING"}
            >
              {sessionStatus === "SAVING" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText type="bodyBold" style={{ color: "#fff" }}>
                  Finish Session
                </ThemedText>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.outlineButton,
                  {
                    flex: 1,
                    borderColor: theme.success,
                    backgroundColor: theme.success + "1A",
                  },
                ]}
                onPress={handleFinishSession}
                disabled={sessionStatus === "SAVING"}
              >
                {sessionStatus === "SAVING" ? (
                  <ActivityIndicator color={theme.success} />
                ) : (
                  <ThemedText type="bodyBold" style={{ color: theme.success }}>
                    Stop & Save
                  </ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outlineButton,
                  {
                    flex: 0.4,
                    borderColor: theme.warning,
                    backgroundColor: theme.warning + "1A",
                  },
                ]}
                onPress={handleCancel}
              >
                <ThemedText type="bodyBold" style={{ color: theme.warning }}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // Removed absolute positioning and backdrop veil
    zIndex: 100,
    gap: 16,
    paddingVertical: 10,
  },
  hudTopSection: {
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sideBadgeText: {
    ...Typography.label,
    fontWeight: "800",
  },
  phaseCard: {
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
  },
  phaseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  phaseEmoji: {
    fontSize: 32,
  },
  phaseTextContent: {
    flex: 1,
  },
  phaseLabel: {
    ...Typography.heading2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  repBadge: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  repBadgeText: {
    ...Typography.label,
    fontWeight: "800",
    opacity: 0.7,
  },
  harmonyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  harmonyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  harmonyTextGroup: {
    flex: 1,
  },
  harmonyLabel: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  harmonyValue: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "600",
  },
  miniProgressBg: {
    height: 4,
    width: "100%",
  },
  miniProgressFill: {
    height: "100%",
  },
  hudBottomSection: {
    marginTop: 20,
    gap: 12,
  },
  cueCard: {
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 6,
  },
  cueLabel: {
    ...Typography.label,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    gap: 4,
  },
  actionRow: {
    width: "100%",
    marginTop: 8,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  mainButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  outlineButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
});
