import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
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
          <View style={[styles.iconCircle, { backgroundColor: theme.tint + '20' }]}>
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
            <View key={b.title} style={[styles.benefitRow, { backgroundColor: theme.cardBackground }]}>
              <ThemedText style={styles.benefitIcon}>{b.icon}</ThemedText>
              <View style={styles.benefitText}>
                <ThemedText style={[styles.benefitTitle, { color: theme.text }]}>{b.title}</ThemedText>
                <ThemedText style={[styles.benefitDesc, { color: theme.textSecondary }]}>{b.desc}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
          onPress={() => router.push('/onboarding/profile' as any)}
        >
          <ThemedText style={styles.primaryBtnText}>Get Started →</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 40 },
  heroSection: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  heroIcon: { fontSize: 48 },
  title: { fontSize: 34, fontWeight: '800', textAlign: 'center', lineHeight: 42, marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  benefitsList: { gap: 12 },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 16, borderRadius: 16,
  },
  benefitIcon: { fontSize: 28 },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 15, fontWeight: '700' },
  benefitDesc: { fontSize: 13, lineHeight: 18 },
  footer: { paddingHorizontal: 28, paddingBottom: 32 },
  primaryBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});