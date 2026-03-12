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
import { Colors } from "@/constants/theme";
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
    router.replace("/(tabs)" as any);
  };

  const renderContent = () => {
    switch (pairingState) {
      case "idle":
        return (
          <>
            <View
              style={[
                styles.deviceIcon,
                { backgroundColor: theme.tint + "20" },
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
              style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
              onPress={handleStartPairing}
            >
              <ThemedText style={styles.primaryBtnText}>
                Search for Device
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
                  backgroundColor: theme.tint + "20",
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
            <ActivityIndicator size="large" color={theme.tint} />
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
              style={[styles.primaryBtn, { backgroundColor: theme.success }]}
              onPress={handleFinish}
            >
              <ThemedText style={styles.primaryBtnText}>
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
              style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
              onPress={handleStartPairing}
            >
              <ThemedText style={styles.primaryBtnText}>Try Again</ThemedText>
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
        <ThemedText style={[styles.step, { color: theme.tint }]}>
          STEP 2 OF 2
        </ThemedText>
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
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  step: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 60,
  },
  centerContent: { alignItems: "center", gap: 20 },
  deviceIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  deviceEmoji: { fontSize: 52 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 15 },
});
