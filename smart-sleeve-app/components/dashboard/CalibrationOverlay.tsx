import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useSelector } from "react-redux";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import type { CalibrationCoefficients } from "@/store/userSlice";
import { useAppDispatch } from "@/hooks/storeHooks";
import {
  startBaseline,
  startMVC,
  addSample,
  finalizeBaseline,
  finalizeMVC,
  buildCoefficients,
  reset,
  BASELINE_DURATION_SEC,
} from "@/services/NormalizationService";
import { AppModal } from "@/components/ui/AppModal";
import { ThemedText } from "@/components/themed-text";
import {
  selectIsSignalWarmedUp,
  setCalibrationScenarioOverride,
} from "@/store/deviceSlice";
import { RAW_SIGNAL_READING_LABEL } from "@/components/dashboard/signalDisplay";

const MVC_DURATION_SEC = 5;
export const CALIBRATION_CHANNEL_LABELS = ["VMO", "VL", "ST", "BF"];
type CalibrationPhase = "intro" | "rest" | "flex" | "confirm" | "error";

interface CalibrationOverlayProps {
  visible: boolean;
  liveSample: number[];
  onComplete: (coeffs: CalibrationCoefficients) => void;
  onDismiss: () => void;
}

export default function CalibrationOverlay({
  visible,
  liveSample,
  onComplete,
  onDismiss,
}: CalibrationOverlayProps) {
  const dispatch = useAppDispatch();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isSignalWarmedUp = useSelector(selectIsSignalWarmedUp);
  const [phase, setPhase] = useState<CalibrationPhase>("intro");
  const [countdown, setCountdown] = useState(0);
  const [baseline, setBaseline] = useState<number[] | null>(null);
  const [mvc, setMVC] = useState<number[] | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const progressAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const cleanupCalibrationRuntime = useCallback(() => {
    // Always clear the override on every exit path so mock calibration cannot leak into normal workout scenarios.
    clearCountdown();
    dispatch(setCalibrationScenarioOverride(null));
    reset();
  }, [clearCountdown, dispatch]);

  useEffect(() => {
    if ((phase === "rest" || phase === "flex") && liveSample.length > 0) {
      addSample(liveSample);
    }
  }, [liveSample, phase]);

  useEffect(() => {
    if (!visible) {
      cleanupCalibrationRuntime();
      return;
    }

    if (visible) {
      reset();
      dispatch(setCalibrationScenarioOverride(null));
      setPhase("intro");
      setBaseline(null);
      setMVC(null);
      setErrorMsg("");
      progressAnim.setValue(0);
    }
  }, [cleanupCalibrationRuntime, dispatch, progressAnim, visible]);

  useEffect(() => {
    return () => {
      cleanupCalibrationRuntime();
    };
  }, [cleanupCalibrationRuntime]);

  const runCountdown = useCallback(
    (duration: number, onDone: () => void) => {
      clearCountdown();
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration * 1000,
        useNativeDriver: false,
      }).start();
      let remaining = duration;
      setCountdown(remaining);
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearCountdown();
          onDone();
        }
      }, 1000);
    },
    [clearCountdown, progressAnim],
  );

  const startMVCPhase = useCallback(() => {
    dispatch(setCalibrationScenarioOverride("FLEX"));
    startMVC();
    setPhase("flex");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    runCountdown(MVC_DURATION_SEC, () => {
      try {
        const m = finalizeMVC();
        setMVC(m);
        setPhase("confirm");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        dispatch(setCalibrationScenarioOverride(null));
        setErrorMsg("MVC capture failed. Please flex harder and try again.");
        setPhase("error");
      }
    });
  }, [dispatch, runCountdown]);

  const startRestPhase = useCallback(() => {
    if (!isSignalWarmedUp) return;

    reset();
    dispatch(setCalibrationScenarioOverride("REST"));
    startBaseline();
    setPhase("rest");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    runCountdown(BASELINE_DURATION_SEC, () => {
      try {
        const b = finalizeBaseline();
        setBaseline(b);
        startMVCPhase();
      } catch {
        dispatch(setCalibrationScenarioOverride(null));
        setErrorMsg("Baseline capture failed. Please try again.");
        setPhase("error");
      }
    });
  }, [dispatch, isSignalWarmedUp, runCountdown, startMVCPhase]);

  const handleConfirm = useCallback(() => {
    if (!baseline || !mvc) return;
    cleanupCalibrationRuntime();
    onComplete(buildCoefficients(baseline, mvc));
  }, [baseline, cleanupCalibrationRuntime, mvc, onComplete]);

  const handleRetry = useCallback(() => {
    cleanupCalibrationRuntime();
    setPhase("intro");
    setBaseline(null);
    setMVC(null);
    setErrorMsg("");
    progressAnim.setValue(0);
  }, [cleanupCalibrationRuntime, progressAnim]);

  const handleDismiss = useCallback(() => {
    cleanupCalibrationRuntime();
    onDismiss();
  }, [cleanupCalibrationRuntime, onDismiss]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const renderChannelRow = (values: number[]) => (
    <View style={styles.channelGrid}>
      {CALIBRATION_CHANNEL_LABELS.map((ch, i) => (
        <View
          key={ch}
          style={[
            styles.channelChip,
            { borderColor: theme.border, backgroundColor: theme.secondaryCard },
          ]}
        >
          <ThemedText
            type="label"
            style={[styles.channelLabel, { color: theme.textSecondary }]}
          >
            {ch}
          </ThemedText>
          <ThemedText
            type="bodyBold"
            style={[styles.channelValue, { color: theme.text }]}
          >
            {values[i]?.toFixed(3) ?? "—"}
          </ThemedText>
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    switch (phase) {
      case "intro":
        return (
          <View style={styles.phaseContent}>
            <View
              style={[
                styles.stepCard,
                { backgroundColor: theme.secondaryCard },
              ]}
            >
              <ThemedText
                type="bodyBold"
                style={[styles.stepTitle, { color: theme.primary }]}
              >
                Step 1 — Rest (5s)
              </ThemedText>
              <ThemedText
                style={[styles.stepDesc, { color: theme.textSecondary }]}
              >
                Sit still with your leg relaxed. We measure your muscle noise
                floor.
              </ThemedText>
            </View>
            <View
              style={[
                styles.stepCard,
                { backgroundColor: theme.secondaryCard },
              ]}
            >
              <ThemedText
                type="bodyBold"
                style={[styles.stepTitle, { color: theme.success }]}
              >
                Step 2 — Flex (5s)
              </ThemedText>
              <ThemedText
                style={[styles.stepDesc, { color: theme.textSecondary }]}
              >
                Contract your quad as hard as possible. This sets your 100% MVC
                reference point.
              </ThemedText>
            </View>
          </View>
        );
      case "rest":
        return (
          <View style={styles.centerPhase}>
            <ThemedText
              type="label"
              style={[styles.phaseIndicator, { color: theme.primary }]}
            >
              STEP 1 OF 2
            </ThemedText>
            <ThemedText style={[styles.countdown, { color: theme.primary }]}>
              {countdown}s
            </ThemedText>
            <View
              style={[styles.progressTrack, { backgroundColor: theme.border }]}
            >
              <Animated.View
                style={[
                  styles.progressBar,
                  { width: progressWidth, backgroundColor: theme.primary },
                ]}
              />
            </View>
            <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
              Measuring baseline noise floor…
            </ThemedText>
          </View>
        );
      case "flex":
        return (
          <View style={styles.centerPhase}>
            <ThemedText
              type="label"
              style={[styles.phaseIndicator, { color: theme.success }]}
            >
              STEP 2 OF 2
            </ThemedText>
            <ThemedText style={[styles.countdown, { color: theme.success }]}>
              {countdown}s
            </ThemedText>
            <View
              style={[styles.progressTrack, { backgroundColor: theme.border }]}
            >
              <Animated.View
                style={[
                  styles.progressBar,
                  { width: progressWidth, backgroundColor: theme.success },
                ]}
              />
            </View>
            <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
              Hold maximum contraction…
            </ThemedText>
          </View>
        );
      case "confirm":
        return (
          <View style={styles.phaseContent}>
            {baseline && (
              <View style={styles.resultBlock}>
                <ThemedText
                  type="label"
                  style={[styles.resultLabel, { color: theme.textSecondary }]}
                >
                  Baseline (Rest) — {RAW_SIGNAL_READING_LABEL}
                </ThemedText>
                {renderChannelRow(baseline)}
              </View>
            )}
            {mvc && (
              <View style={styles.resultBlock}>
                <ThemedText
                  type="label"
                  style={[styles.resultLabel, { color: theme.textSecondary }]}
                >
                  MVC Peak (500ms window) — {RAW_SIGNAL_READING_LABEL}
                </ThemedText>
                {renderChannelRow(mvc)}
              </View>
            )}
          </View>
        );
      case "error":
        return (
          <View style={styles.centerPhase}>
            <ThemedText style={[styles.errorText, { color: theme.warning }]}>
              {errorMsg}
            </ThemedText>
          </View>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (phase) {
      case "intro":
        return "🎯 Calibration";
      case "rest":
        return "😌 Relax";
      case "flex":
        return "💪 FLEX NOW";
      case "confirm":
        return "✅ Complete";
      case "error":
        return "⚠️ Failed";
    }
  };

  const getSubtitle = () => {
    switch (phase) {
      case "intro":
        return isSignalWarmedUp
          ? "A 2-step process to personalise your signal readings."
          : "Preparing the filtered signal before calibration can begin.";
      case "rest":
        return "Keep your leg completely still and relaxed.";
      case "flex":
        return "Contract your quad as hard as you can and hold it!";
      case "confirm":
        return "Review your values. Confirm to enable Clinical % MVC mode.";
      case "error":
        return "There was an issue during capture.";
    }
  };

  const renderFooter = () => {
    if (phase === "intro") {
      return (
        <>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={startRestPhase}
            disabled={!isSignalWarmedUp}
          >
            <ThemedText type="bodyBold" style={styles.primaryBtnText}>
              {isSignalWarmedUp ? "Start Calibration" : "Preparing signal..."}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={handleDismiss}>
            <ThemedText style={{ color: theme.textSecondary }}>
              Cancel
            </ThemedText>
          </TouchableOpacity>
        </>
      );
    }
    if (phase === "confirm") {
      return (
        <>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.success }]}
            onPress={handleConfirm}
          >
            <ThemedText type="bodyBold" style={styles.primaryBtnText}>
              Save & Enable % MVC
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={handleRetry}
          >
            <ThemedText type="bodyBold" style={{ color: theme.text }}>
              Retry
            </ThemedText>
          </TouchableOpacity>
        </>
      );
    }
    if (phase === "error") {
      return (
        <>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={handleRetry}
          >
            <ThemedText type="bodyBold" style={styles.primaryBtnText}>
              Try Again
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={handleDismiss}>
            <ThemedText style={{ color: theme.textSecondary }}>
              Cancel
            </ThemedText>
          </TouchableOpacity>
        </>
      );
    }
    return null;
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleDismiss}
      title={getTitle()}
      subtitle={getSubtitle()}
      footer={renderFooter()}
    >
      <View style={styles.modalContentContainer}>{renderContent()}</View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  phaseIndicator: {
    textAlign: "center",
    marginBottom: 8,
  },
  centerPhase: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 16,
  },
  phaseContent: {
    gap: 16,
  },
  countdown: {
    fontSize: 72,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 80,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
  stepCard: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  stepTitle: {
    fontSize: 15,
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultBlock: {
    gap: 12,
  },
  resultLabel: {
    fontSize: 10,
    marginLeft: 4,
  },
  channelGrid: {
    flexDirection: "row",
    gap: 8,
  },
  channelChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  channelLabel: {
    fontSize: 10,
  },
  channelValue: {
    fontSize: 14,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  modalContentContainer: {
    minHeight: 400, // Provides vertical stability across different phases
    justifyContent: "center",
  },
});
