import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, Shadows } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { setInjuredSide, setInjuryDetails, setTherapyGoal } from '@/store/userSlice';
import type { InjuredSide } from '@/store/userSlice';

const THERAPY_GOALS = [
  { id: 'range', label: '📐 Restore Range of Motion' },
  { id: 'strength', label: '💪 Rebuild Muscle Strength' },
  { id: 'pain', label: '🧊 Reduce Pain & Swelling' },
  { id: 'return', label: '🏃 Return to Sport / Activity' },
];

export default function OnboardingProfile() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const dispatch = useDispatch();
  const [selected, setSelected] = useState<InjuredSide | null>(null);
  const [injuryDetails, setInjuryDetailsLocal] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const canContinue = selected !== null && selectedGoal !== null;

  const handleContinue = () => {
    if (!selected || !selectedGoal) return;
    dispatch(setInjuredSide(selected));
    dispatch(setInjuryDetails(injuryDetails));
    dispatch(setTherapyGoal(selectedGoal));
    router.push('/onboarding/pairing' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.step, { color: theme.primary }]}>STEP 1 OF 2</ThemedText>
        <ThemedText style={[styles.title, { color: theme.text }]}>Your Profile</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Help us personalise your rehabilitation experience.
        </ThemedText>

        {/* Injured Side */}
        <ThemedText type="bodyBold" style={[styles.sectionLabel, { color: theme.text }]}>Which leg is being rehabilitated?</ThemedText>
        <View style={styles.optionsRow}>
          {(['LEFT', 'RIGHT'] as InjuredSide[]).map((side) => {
            const isSelected = selected === side;
            return (
              <TouchableOpacity
                key={side}
                style={[
                  styles.sideCard,
                  {
                    borderColor: isSelected ? theme.primary : 'transparent',
                    backgroundColor: isSelected ? theme.primary + '15' : theme.cardBackground,
                  },
                  isSelected ? Shadows.card : { borderWidth: 1, borderColor: theme.border }
                ]}
                onPress={() => setSelected(side)}
              >
                <ThemedText style={styles.legIcon}>🦵</ThemedText>
                <ThemedText type="bodyBold" style={[styles.sideLabel2, { color: isSelected ? theme.primary : theme.text }]}>
                  {side === 'LEFT' ? 'Left Leg' : 'Right Leg'}
                </ThemedText>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                    <ThemedText style={styles.checkText}>✓</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Injury Details */}
        <ThemedText type="bodyBold" style={[styles.sectionLabel, { color: theme.text }]}>Injury details (optional)</ThemedText>
        <TextInput
          style={[styles.textInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="e.g. ACL tear, meniscus repair, post-op..."
          placeholderTextColor={theme.textSecondary}
          value={injuryDetails}
          onChangeText={setInjuryDetailsLocal}
          multiline
        />

        {/* Therapy Goals */}
        <ThemedText type="bodyBold" style={[styles.sectionLabel, { color: theme.text }]}>Primary therapy goal</ThemedText>
        <View style={styles.goalsList}>
          {THERAPY_GOALS.map((goal) => {
            const isSelected = selectedGoal === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalRow,
                  {
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected ? theme.primary + '15' : theme.cardBackground,
                  }
                ]}
                onPress={() => setSelectedGoal(goal.id)}
              >
                <ThemedText type="bodyBold" style={[styles.goalLabel, { color: isSelected ? theme.primary : theme.text }]}>
                  {goal.label}
                </ThemedText>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                    <ThemedText style={styles.checkText}>✓</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: canContinue ? theme.primary : theme.border }, canContinue && Shadows.button]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <ThemedText type="bodyBold" style={[styles.primaryBtnText, { color: canContinue ? '#fff' : theme.textSecondary }]}>
              Continue →
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={[styles.backBtnText, { color: theme.textSecondary }]}>← Back</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  step: { ...Typography.label, fontSize: 10, marginBottom: 8 },
  title: { ...Typography.heading1, marginBottom: 8 },
  subtitle: { ...Typography.body, marginBottom: 32 },
  sectionLabel: { fontSize: 15, marginBottom: 12, marginTop: 8 },
  optionsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  sideCard: {
    flex: 1, borderRadius: 24,
    padding: 24, alignItems: 'center', gap: 12, position: 'relative',
    borderWidth: 2,
  },
  legIcon: { fontSize: 40 },
  sideLabel2: { fontSize: 16 },
  checkBadge: {
    position: 'absolute', top: 12, right: 12,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  textInput: {
    borderWidth: 1, borderRadius: 16, padding: 16,
    ...Typography.body, minHeight: 100,
    marginBottom: 24, textAlignVertical: 'top',
  },
  goalsList: { gap: 12, marginBottom: 32 },
  goalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderRadius: 16, padding: 18, position: 'relative',
  },
  goalLabel: { fontSize: 15 },
  footer: { gap: 12 },
  primaryBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { fontSize: 17 },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { ...Typography.body, fontSize: 15 },
});