import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { router } from 'expo-router';
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, Shadows } from '@/constants/theme';
import { EXERCISE_LIBRARY, Exercise } from '@/constants/exercises';
import { startWorkout } from '@/store/deviceSlice';

const FOCUS_COLORS: Record<string, string> = {
  'VMO / VL Balance': '#0B74E6',
  'Quad Recruitment': '#00A878',
  'Hamstring Co-contraction': '#F59E0B',
  'Range of Motion': '#7C3AED',
};

export default function ExercisesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const dispatch = useDispatch();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedSide, setSelectedSide] = useState<'LEFT' | 'RIGHT'>('LEFT');

  const handleStartSession = () => {
    if (!selectedExercise) return;
    dispatch(
      startWorkout({
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        targetSide: selectedSide,
        totalReps: selectedExercise.targetReps,
        workDurationSec: selectedExercise.workDurationSec,
        restDurationSec: selectedExercise.restDurationSec,
      })
    );
    setSelectedExercise(null);
    router.push('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.push('/modal')} style={styles.iconButton}>
          <IconSymbol name="gearshape.fill" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={styles.brandBadge}>
           <ThemedText style={[styles.brandBadgeText, { color: theme.primary }]}>REHAB LIBRARY</ThemedText>
        </View>
        <TouchableOpacity onPress={() => console.log("Notification")} style={styles.iconButton}>
          <IconSymbol name="bell.fill" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.greeting}>Guided Rehab</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Choose an exercise to begin your supervised clinical session
        </ThemedText>

        <View style={styles.listContainer}>
          {EXERCISE_LIBRARY.map((exercise) => {
            const accentColor = FOCUS_COLORS[exercise.focus] ?? theme.primary;
            return (
              <TouchableOpacity
                key={exercise.id}
                style={[styles.card, { backgroundColor: theme.cardBackground }, Shadows.card]}
                onPress={() => { setSelectedSide('LEFT'); setSelectedExercise(exercise); }}
                activeOpacity={0.9}
              >
                <View style={[styles.accentTag, { backgroundColor: accentColor }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.exerciseName}>{exercise.name}</ThemedText>
                    <View style={[styles.focusBadge, { backgroundColor: accentColor + '10' }]}>
                      <Text style={[styles.focusText, { color: accentColor }]}>{exercise.focus.toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <ThemedText style={[styles.description, { color: theme.textSecondary }]}>{exercise.description}</ThemedText>
                  
                  <View style={styles.metricGrid}>
                    <View style={styles.metricItem}>
                      <ThemedText type="label" style={styles.metricLabel}>GOAL</ThemedText>
                      <ThemedText style={styles.metricValue}>{exercise.targetReps} Reps</ThemedText>
                    </View>
                    <View style={styles.metricItem}>
                      <ThemedText type="label" style={styles.metricLabel}>TEMPO</ThemedText>
                      <ThemedText style={styles.metricValue}>{exercise.workDurationSec}s Hold</ThemedText>
                    </View>
                  </View>

                  <View style={[styles.tipContainer, { backgroundColor: theme.secondaryCard }]}>
                    <ThemedText type="label" style={[styles.tipTitle, { color: accentColor }]}>COACH TIP</ThemedText>
                    <ThemedText style={styles.tipText}>{exercise.formTip}</ThemedText>
                  </View>

                  <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: theme.primary, ...Shadows.button }]}
                    onPress={() => { setSelectedSide('LEFT'); setSelectedExercise(exercise); }}
                  >
                    <ThemedText style={styles.startButtonText}>Start Protocol</ThemedText>
                    <IconSymbol name="chevron.right" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={selectedExercise !== null} animationType="fade" transparent onRequestClose={() => setSelectedExercise(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHandle} />
            <ThemedText type="subtitle" style={styles.modalTitle}>{selectedExercise?.name}</ThemedText>
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Select the limb you are rehabbing today</ThemedText>
            
            <View style={styles.sideRow}>
              {(['LEFT', 'RIGHT'] as const).map((side) => (
                <TouchableOpacity
                  key={side}
                  style={[
                    styles.sideButton, 
                    { backgroundColor: selectedSide === side ? theme.primary : theme.secondaryCard, borderColor: selectedSide === side ? theme.primary : theme.border }
                  ]}
                  onPress={() => setSelectedSide(side)}
                >
                  <ThemedText style={[styles.sideButtonText, { color: selectedSide === side ? '#fff' : theme.textSecondary }]}>
                    {side === 'LEFT' ? 'Left Knee' : 'Right Knee'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.confirmButton, { backgroundColor: theme.success, ...Shadows.button }]} onPress={handleStartSession}>
              <ThemedText style={styles.confirmButtonText}>Begin Session</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelLink} onPress={() => setSelectedExercise(null)}>
              <ThemedText style={{ color: theme.textSecondary }}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  brandBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' },
  brandBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  iconButton: { padding: 8 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  greeting: { marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 32, lineHeight: 22 },
  listContainer: { gap: 24 },
  card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  accentTag: { height: 4 },
  cardBody: { padding: 20, gap: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exerciseName: { fontSize: 18, flex: 1, marginRight: 8 },
  focusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  focusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  description: { fontSize: 14, lineHeight: 20 },
  metricGrid: { flexDirection: 'row', gap: 24, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 16 },
  metricItem: { gap: 4 },
  metricLabel: { fontSize: 9, opacity: 0.5 },
  metricValue: { fontSize: 14, fontWeight: '700' },
  tipContainer: { padding: 12, borderRadius: 12, gap: 4 },
  tipTitle: { fontSize: 9, fontWeight: '800' },
  tipText: { fontSize: 12, fontStyle: 'italic', opacity: 0.8 },
  startButton: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 },
  startButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, gap: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalTitle: { textAlign: 'center' },
  modalSubtitle: { textAlign: 'center', fontSize: 15, marginBottom: 8 },
  sideRow: { flexDirection: 'row', gap: 12 },
  sideButton: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  sideButtonText: { fontSize: 15, fontWeight: '700' },
  confirmButton: { paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginTop: 8 },
  confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  cancelLink: { alignItems: 'center', paddingVertical: 12 },
});