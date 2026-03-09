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
      })
    );
    setSelectedExercise(null);
    router.push('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.push('/modal')} style={styles.iconButton}>
          <Image
            source={require('../../assets/images/settings.png')}
            style={{ width: 24, height: 24, resizeMode: 'contain', tintColor: theme.icon ?? theme.text }}
          />
        </TouchableOpacity>
        <Text style={[Typography.heading2, { color: theme.text, marginLeft: 10 }]}>
          Exercise Library
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Select an exercise to begin a guided session
      </Text>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {EXERCISE_LIBRARY.map((exercise) => {
          const accentColor = FOCUS_COLORS[exercise.focus] ?? theme.tint;
          return (
            <TouchableOpacity
              key={exercise.id}
              style={[styles.card, { backgroundColor: theme.cardBackground }, Shadows.card]}
              onPress={() => { setSelectedSide('LEFT'); setSelectedExercise(exercise); }}
              activeOpacity={0.85}
            >
              <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
                  <View style={[styles.focusBadge, { backgroundColor: accentColor + '22' }]}>
                    <Text style={[styles.focusText, { color: accentColor }]}>{exercise.focus}</Text>
                  </View>
                </View>
                <Text style={[styles.description, { color: theme.textSecondary }]}>{exercise.description}</Text>
                <View style={styles.chipRow}>
                  <View style={[styles.chip, { backgroundColor: theme.border }]}>
                    <Text style={[styles.chipText, { color: theme.text }]}>{exercise.targetReps} reps</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: theme.border }]}>
                    <Text style={[styles.chipText, { color: theme.text }]}>{exercise.workDurationSec}s work</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: theme.border }]}>
                    <Text style={[styles.chipText, { color: theme.text }]}>{exercise.restDurationSec}s rest</Text>
                  </View>
                </View>
                <View style={[styles.tipBox, { borderLeftColor: accentColor }]}>
                  <Text style={[styles.tipLabel, { color: accentColor }]}>Form Tip</Text>
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>{exercise.formTip}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: accentColor }]}
                  onPress={() => { setSelectedSide('LEFT'); setSelectedExercise(exercise); }}
                >
                  <Text style={styles.startButtonText}>▶  Start Session</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={selectedExercise !== null} animationType="slide" transparent onRequestClose={() => setSelectedExercise(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedExercise?.name}</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Which leg are you targeting?</Text>
            <View style={styles.sideRow}>
              {(['LEFT', 'RIGHT'] as const).map((side) => (
                <TouchableOpacity
                  key={side}
                  style={[styles.sideButton, { backgroundColor: selectedSide === side ? theme.tint : theme.border }]}
                  onPress={() => setSelectedSide(side)}
                >
                  <Text style={[styles.sideButtonText, { color: selectedSide === side ? '#fff' : theme.text }]}>
                    {side === 'LEFT' ? '🦵 Left' : 'Right 🦵'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.protocolBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.protocolRow, { color: theme.textSecondary }]}>
                Reps: <Text style={{ color: theme.text, fontWeight: '600' }}>{selectedExercise?.targetReps}</Text>
              </Text>
              <Text style={[styles.protocolRow, { color: theme.textSecondary }]}>
                Work: <Text style={{ color: theme.text, fontWeight: '600' }}>{selectedExercise?.workDurationSec}s</Text>
                {'   '}Rest: <Text style={{ color: theme.text, fontWeight: '600' }}>{selectedExercise?.restDurationSec}s</Text>
              </Text>
              <Text style={[styles.protocolRow, { color: theme.textSecondary, fontStyle: 'italic' }]}>
                &ldquo;{selectedExercise?.formTip}&rdquo;
              </Text>
            </View>
            <TouchableOpacity style={[styles.confirmButton, { backgroundColor: theme.success }]} onPress={handleStartSession}>
              <Text style={styles.confirmButtonText}>Begin Guided Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={() => setSelectedExercise(null)}>
              <Text style={[styles.cancelLinkText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  iconButton: { padding: 8 },
  subtitle: { fontSize: 14, paddingHorizontal: 26, marginBottom: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  card: { borderRadius: 16, overflow: 'hidden', flexDirection: 'row' },
  accentBar: { width: 5 },
  cardContent: { flex: 1, padding: 16, gap: 10 },
  cardHeader: { gap: 6 },
  exerciseName: { fontSize: 18, fontWeight: '700' },
  focusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  focusText: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 18 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '500' },
  tipBox: { borderLeftWidth: 3, paddingLeft: 10, gap: 2 },
  tipLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  tipText: { fontSize: 12, fontStyle: 'italic', lineHeight: 17 },
  startButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  startButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center' },
  sideRow: { flexDirection: 'row', gap: 12 },
  sideButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  sideButtonText: { fontSize: 16, fontWeight: '600' },
  protocolBox: { borderRadius: 12, padding: 14, gap: 6 },
  protocolRow: { fontSize: 14, lineHeight: 20 },
  confirmButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelLink: { alignItems: 'center', paddingVertical: 8 },
  cancelLinkText: { fontSize: 14 },
});