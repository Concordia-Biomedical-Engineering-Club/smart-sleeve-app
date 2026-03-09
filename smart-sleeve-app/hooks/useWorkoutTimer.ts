import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppDispatch, useAppSelector } from './storeHooks';
import { workoutTick, selectWorkout, selectWorkoutPhase } from '@/store/deviceSlice';

export function useWorkoutTimer() {
  const dispatch = useAppDispatch();
  const phase = useAppSelector(selectWorkoutPhase);
  const workout = useAppSelector(selectWorkout);
  const prevPhaseRef = useRef(phase);

  // Haptic feedback on phase transitions
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev === phase) return;
    prevPhaseRef.current = phase;

    switch (phase) {
      case 'COUNTDOWN':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'ACTIVE_WORK':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'ACTIVE_REST':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'COMPLETING':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      default:
        break;
    }
  }, [phase]);

  // Tick every second while workout is running
  useEffect(() => {
    if (phase === 'IDLE' || phase === 'COMPLETING') return;

    const id = setInterval(() => {
      // Audio/Haptic cue for countdown ticks
      if (phase === 'COUNTDOWN') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      dispatch(workoutTick());
    }, 1000);

    return () => clearInterval(id);
  }, [phase, dispatch]);

  return workout;
}