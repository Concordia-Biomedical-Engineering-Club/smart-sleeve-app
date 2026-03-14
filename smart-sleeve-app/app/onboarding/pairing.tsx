import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography, Shadows } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { completeOnboarding } from "@/store/userSlice";
import { setIsScanning } from "@/store/deviceSlice";
import { useSleeve } from "@/hooks/useSleeve";

type PairingState = "idle" | "scanning" | "connecting" | "paired" | "error";

export default function OnboardingPairing() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const dispatch = useDispatch();
  const connector = useSleeve();
  const router = useRouter();
  const [pairingState, setPairingState] = useState<PairingState>("idle");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (pairingState !== "scanning" && pairingState !== "connecting") {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      pulseAnim.setValue(1);
    };
  }, [pairingState, pulseAnim]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleStartPairing = async () => {
    setErrorMessage(null);
    setDeviceName(null);
    setPairingState("scanning");
    dispatch(setIsScanning(true));

    try {
      const devices = await connector.scan();
      const firstDevice = devices[0];

      if (!firstDevice) {
        throw new Error("No devices found");
      }

      if (!isMountedRef.current) {
        return;
      }

      setDeviceName(firstDevice);
      setPairingState("connecting");

      await connector.connect(firstDevice);

      if (!isMountedRef.current) {
        return;
      }

      setPairingState("paired");
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setErrorMessage(
        "Unable to connect to the Smart Sleeve demo right now. Please try again.",
      );
      setPairingState("error");
    } finally {
      if (isMountedRef.current) {
        dispatch(setIsScanning(false));
      }
    }
  };

  const handleFinish = () => {
    dispatch(completeOnboarding());
    router.replace("/(tabs)/dashboard" as any);
  };

  const renderContent = () => {
    switch (pairingState) {
      case "idle":
        return (
          <>
            <View
              style={[
                styles.deviceIcon,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <ThemedText style={styles.deviceEmoji}>📡</ThemedText>
            </View>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Connect Your Sleeve
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Make sure your Smart Sleeve is powered on and within range. Tap
              below to search for your device.
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }, Shadows.button]}
              onPress={handleStartPairing}
            >
              <ThemedText type="bodyBold" style={styles.primaryBtnText}>
                Search for Device
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleFinish}
            >
              <ThemedText style={[styles.skipBtnText, { color: theme.textSecondary }]}>
                Skip for now
              </ThemedText>
            </TouchableOpacity>
          </>
        );
      case "scanning":
        return (
          <>
            <Animated.View
              style={[
                styles.deviceIcon,
                {
                  backgroundColor: theme.primary + "20",
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <ThemedText style={styles.deviceEmoji}>📡</ThemedText>
            </Animated.View>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Searching…
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Looking for Smart Sleeve devices nearby.
            </ThemedText>
            <ActivityIndicator size="large" color={theme.primary} />
          </>
        );
      case "connecting":
        return (
          <>
            <View
              style={[
                styles.deviceIcon,
                { backgroundColor: theme.warning + "20" },
              ]}
            >
              <ThemedText style={styles.deviceEmoji}>🔗</ThemedText>
            </View>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Pairing…
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              {deviceName ?? "Smart Sleeve (Demo)"} found. Establishing the demo
              connection now.
            </ThemedText>
            <ActivityIndicator size="large" color={theme.warning} />
          </>
        );
      case "paired":
        return (
          <>
            <View
              style={[
                styles.deviceIcon,
                { backgroundColor: theme.success + "20" },
              ]}
            >
              <ThemedText style={styles.deviceEmoji}>✅</ThemedText>
            </View>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Connected!
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              {deviceName ?? "Smart Sleeve (Demo)"} is connected and ready.
              You&apos;re all set to start your rehabilitation journey.
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.success }, Shadows.button]}
              onPress={handleFinish}
            >
              <ThemedText type="bodyBold" style={styles.primaryBtnText}>
                Go to Dashboard →
              </ThemedText>
            </TouchableOpacity>
          </>
        );
      case "error":
        return (
          <>
            <View
              style={[
                styles.deviceIcon,
                { backgroundColor: theme.warning + "20" },
              ]}
            >
              <ThemedText style={styles.deviceEmoji}>⚠️</ThemedText>
            </View>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Pairing Failed
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              {errorMessage}
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }, Shadows.button]}
              onPress={handleStartPairing}
            >
              <ThemedText type="bodyBold" style={styles.primaryBtnText}>Try Again</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleFinish}
            >
              <ThemedText style={[styles.skipBtnText, { color: theme.textSecondary }]}>
                Skip & Go to Dashboard
              </ThemedText>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.primary, width: '90%' }]} />
          </View>
          <ThemedText style={[styles.stepText, { color: theme.textSecondary }]}>Almost Done</ThemedText>
        </View>
        <View style={styles.centerContent}>{renderContent()}</View>
      </View>

      {(pairingState === "idle" || pairingState === "error") && (
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ThemedText
              style={[styles.backBtnText, { color: theme.textSecondary }]}
            >
              ← Back
            </ThemedText>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleFinish}
            style={styles.backBtn}
          >
            <ThemedText
              style={[styles.backBtnText, { color: theme.textSecondary }]}
            >
              Skip Step →
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  headerRow: { marginBottom: 60, paddingHorizontal: 24 },
  progressContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  stepText: { ...Typography.label, fontSize: 10 },
  centerContent: { alignItems: "center", gap: 24 },
  deviceIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  deviceEmoji: { fontSize: 44 },
  title: { ...Typography.heading1, textAlign: "center" },
  subtitle: { ...Typography.body, textAlign: "center", maxWidth: '90%' },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "#fff" },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backBtn: { paddingVertical: 8 },
  backBtnText: { ...Typography.body, fontSize: 14, fontWeight: '600' },
  skipBtn: { marginTop: 8, paddingVertical: 12 },
  skipBtnText: { ...Typography.body, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
});
