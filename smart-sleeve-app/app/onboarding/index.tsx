import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, Shadows } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

const BENEFITS = [
  { icon: '📡', title: 'Real-Time EMG', desc: 'Monitor your muscle activation live during every exercise.' },
  { icon: '📐', title: 'Knee Angle Tracking', desc: 'Precise flexion angles to guide your range of motion goals.' },
  { icon: '📈', title: 'Progress Analytics', desc: 'Track your recovery week by week with clinical-grade data.' },
];

export default function OnboardingWelcome() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText style={styles.heroIcon}>🦵</ThemedText>
          </View>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Welcome to{'\n'}Smart Sleeve
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your clinical-grade knee rehabilitation companion.
          </ThemedText>
        </View>

        <View style={styles.benefitsList}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={[styles.benefitRow, { backgroundColor: theme.cardBackground }, Shadows.card]}>
              <ThemedText style={styles.benefitIcon}>{b.icon}</ThemedText>
              <View style={styles.benefitText}>
                <ThemedText type="bodyBold" style={[styles.benefitTitle, { color: theme.text }]}>{b.title}</ThemedText>
                <ThemedText style={[styles.benefitDesc, { color: theme.textSecondary }]}>{b.desc}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.primary }, Shadows.button]}
          onPress={() => router.push('/onboarding/profile' as any)}
        >
          <ThemedText type="bodyBold" style={styles.primaryBtnText}>Get Started →</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  heroSection: { alignItems: 'center', marginBottom: 48 },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  heroIcon: { fontSize: 44 },
  title: { ...Typography.heading1, textAlign: 'center', marginBottom: 12 },
  subtitle: { ...Typography.body, textAlign: 'center', maxWidth: '80%' },
  benefitsList: { gap: 16 },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    padding: 20, borderRadius: 24,
  },
  benefitIcon: { fontSize: 24 },
  benefitText: { flex: 1, gap: 4 },
  benefitTitle: { fontSize: 16 },
  benefitDesc: { ...Typography.caption, color: '#64748B' },
  footer: { paddingHorizontal: 24, paddingBottom: 40 },
  primaryBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff' },
});