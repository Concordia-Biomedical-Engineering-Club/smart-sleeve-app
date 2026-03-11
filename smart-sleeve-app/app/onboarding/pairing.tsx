import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { completeOnboarding } from '@/store/userSlice';

type PairingState = 'idle' | 'scanning' | 'found' | 'paired';

export default function OnboardingPairing() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const dispatch = useDispatch();
  const [pairingState, setPairingState] = useState<PairingState>('idle');
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (pairingState === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();

      const findTimer = setTimeout(() => setPairingState('found'), 2000);
      return () => clearTimeout(findTimer);
    }

    if (pairingState === 'found') {
      const pairTimer = setTimeout(() => setPairingState('paired'), 1500);
      return () => clearTimeout(pairTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairingState]);

  const handleFinish = () => {
    dispatch(completeOnboarding());
    router.replace('/(tabs)');
  };

  const renderContent = () => {
    switch (pairingState) {
      case 'idle':
        return (
          <>
            <View style={[styles.deviceIcon, { backgroundColor: theme.tint + '20' }]}>
              <ThemedText style={styles.deviceEmoji}>📡</ThemedText>
            </View>
            <ThemedText style={[styles.title, { color: theme.text }]}>Connect Your Sleeve</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Make sure your Smart Sleeve is powered on and within range. Tap below to search for your device.
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
              onPress={() => setPairingState('scanning')}
            >
              <ThemedText style={styles.primaryBtnText}>Search for Device</ThemedText>
            </TouchableOpacity>
          </>
        );
      case 'scanning':
        return (
          <>
            <Animated.View style={[styles.deviceIcon, { backgroundColor: theme.tint + '20', transform: [{ scale: pulseAnim }] }]}>
              <ThemedText style={styles.deviceEmoji}>📡</ThemedText>
            </Animated.View>
            <ThemedText style={[styles.title, { color: theme.text }]}>Searching…</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Looking for Smart Sleeve devices nearby.
            </ThemedText>
          </>
        );
      case 'found':
        return (
          <>
            <View style={[styles.deviceIcon, { backgroundColor: theme.warning + '20' }]}>
              <ThemedText style={styles.deviceEmoji}>🔗</ThemedText>
            </View>
            <ThemedText style={[styles.title, { color: theme.text }]}>Device Found!</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Smart Sleeve (Demo) — Pairing…
            </ThemedText>
          </>
        );
      case 'paired':
        return (
          <>
            <View style={[styles.deviceIcon, { backgroundColor: theme.success + '20' }]}>
              <ThemedText style={styles.deviceEmoji}>✅</ThemedText>
            </View>
            <ThemedText style={[styles.title, { color: theme.text }]}>Connected!</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Smart Sleeve (Demo) is ready. You&apos;re all set to start your rehabilitation journey.
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.success }]}
              onPress={handleFinish}
            >
              <ThemedText style={styles.primaryBtnText}>Go to Dashboard →</ThemedText>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <ThemedText style={[styles.step, { color: theme.tint }]}>STEP 2 OF 2</ThemedText>
        <View style={styles.centerContent}>
          {renderContent()}
        </View>
      </View>

      {pairingState === 'idle' && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={[styles.backBtnText, { color: theme.textSecondary }]}>← Back</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
            <ThemedText style={[styles.skipBtnText, { color: theme.textSecondary }]}>Skip for now</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  step: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 60 },
  centerContent: { alignItems: 'center', gap: 20 },
  deviceIcon: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  deviceEmoji: { fontSize: 52 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  primaryBtn: { borderRadius: 16, paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center', marginTop: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  footer: { paddingHorizontal: 28, paddingBottom: 32, flexDirection: 'row', justifyContent: 'space-between' },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 15 },
  skipBtn: { paddingVertical: 8 },
  skipBtnText: { fontSize: 15 },
});