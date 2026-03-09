import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/hooks/storeHooks';
import { cancelWorkout, completeWorkout, selectWorkoutPhase } from '@/store/deviceSlice';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';

const PHASE_CONFIG = {
  IDLE: { label: '', color: 'transparent', emoji: '' },
  COUNTDOWN: { label: 'Get Ready…', color: '#F59E0B', emoji: '⏳' },
  ACTIVE_WORK: { label: 'FLEX NOW', color: '#00A878', emoji: '💪' },
  ACTIVE_REST: { label: 'RELAX', color: '#0B74E6', emoji: '😮‍💨' },
  COMPLETING: { label: 'Session Complete!', color: '#7C3AED', emoji: '🏆' },
};

export function WorkoutOverlay() {
  const dispatch = useAppDispatch();
  const phase = useAppSelector(selectWorkoutPhase);
  const workout = useWorkoutTimer();

  if (phase === 'IDLE') return null;

  const config = PHASE_CONFIG[phase];
  const progressFraction =
    workout.totalReps > 0
      ? (workout.currentRep - (phase === 'ACTIVE_WORK' ? 0 : 1)) / workout.totalReps
      : 0;
  const clampedProgress = Math.min(Math.max(progressFraction, 0), 1);

  const handleCancel = () => dispatch(cancelWorkout());
  const handleDone = () => dispatch(completeWorkout());

  return (
    <View style={styles.overlay}>
      <Text style={styles.exerciseName}>
        {workout.exerciseName ?? 'Exercise'}{' '}
        {workout.targetSide ? `· ${workout.targetSide} Leg` : ''}
      </Text>

      <View style={[styles.phaseBox, { backgroundColor: config.color }]}>
        <Text style={styles.phaseEmoji}>{config.emoji}</Text>
        <Text style={styles.phaseLabel}>{config.label}</Text>
        {phase !== 'COMPLETING' && (
          <Text style={styles.phaseTimer}>{workout.phaseSecondsRemaining}s</Text>
        )}
      </View>

      {phase !== 'COUNTDOWN' && phase !== 'COMPLETING' && (
        <Text style={styles.repCounter}>
          Rep {workout.currentRep} of {workout.totalReps}
        </Text>
      )}

      {phase === 'ACTIVE_WORK' && (
        <Text style={styles.cueText}>Keep your knee locked and squeeze fully</Text>
      )}
      {phase === 'ACTIVE_REST' && (
        <Text style={styles.cueText}>Let the muscle fully relax before the next rep</Text>
      )}

      {workout.totalReps > 0 && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${clampedProgress * 100}%`, backgroundColor: config.color },
            ]}
          />
        </View>
      )}

      <View style={styles.buttonRow}>
        {phase === 'COMPLETING' ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.color }]}
            onPress={handleDone}
          >
            <Text style={styles.buttonText}>Save & Finish</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.buttonText}>Cancel Session</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 20, 35, 0.93)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  exerciseName: {
    color: '#A1B4C8',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  phaseBox: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    gap: 8,
    minWidth: 240,
  },
  phaseEmoji: {
    fontSize: 48,
  },
  phaseLabel: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  phaseTimer: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 48,
    fontWeight: '700',
    marginTop: 4,
  },
  repCounter: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  cueText: {
    color: '#A1B4C8',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 260,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  buttonRow: {
    marginTop: 16,
    width: '100%',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(230, 57, 70, 0.25)',
    borderWidth: 1,
    borderColor: '#E63946',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});