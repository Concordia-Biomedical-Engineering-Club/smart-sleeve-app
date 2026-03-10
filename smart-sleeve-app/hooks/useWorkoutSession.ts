import { useDispatch, useSelector } from 'react-redux';
import {
  startSession,
  endSession,
  sessionSaved,
  sessionSaveFailed,
  selectSessionStatus,
  selectRecordingBuffer,
  selectRecordingKneeAngles,
  selectSessionStartTime,
  selectWorkout,
} from '@/store/deviceSlice';
import { saveSession, SaveSessionResult } from '@/services/SessionService';

/**
 * Custom hook to manage the lifecycle of a workout recording session.
 * Orchestrates the transition between Redux UI state (RECORDING -> SAVING -> IDLE)
 * and the asynchronous SQLite database write operations.
 */
export function useWorkoutSession() {
  const dispatch = useDispatch();
  const sessionStatus = useSelector(selectSessionStatus);
  const recordingBuffer = useSelector(selectRecordingBuffer);
  const kneeAngles = useSelector(selectRecordingKneeAngles);
  const sessionStartTime = useSelector(selectSessionStartTime);
  const workout = useSelector(selectWorkout);

  const startRecording = () => {
    dispatch(startSession());
  };

  /**
   * Ends the current recording session and persists the buffer to SQLite.
   * @param userId The ID of the user performing the workout
   * @returns The result of the save operation, or throws an error
   */
  const endAndSave = async (userId: string): Promise<SaveSessionResult | null> => {
    console.log(`[useWorkoutSession] endAndSave called. Current status: ${sessionStatus}`);
    if (sessionStatus !== 'RECORDING') {
      console.warn(`[useWorkoutSession] Cancelled save because status is not RECORDING`);
      return null;
    }

    // 1. Notify Redux we are transitioning to the SAVING state
    dispatch(endSession());

    try {
      // 2. Perform the heavy SQLite write off the main UI interactions
      const result = await saveSession({
        userId,
        exerciseId: workout.exerciseId ?? 'unknown_exercise',
        exerciseName: workout.exerciseName ?? 'Unknown',
        side: workout.targetSide ?? 'LEFT',
        startTime: sessionStartTime ?? Date.now() - 60000,
        endTime: Date.now(),
        emgBuffer: recordingBuffer,
        kneeAngleBuffer: kneeAngles,
      });

      // 3. Notify Redux of success (clears buffers and resets to IDLE)
      dispatch(sessionSaved());
      return result;
    } catch (e) {
      // 4. Notify Redux of failure (resets to IDLE without clearing buffer)
      dispatch(sessionSaveFailed());
      throw e;
    }
  };

  return {
    startRecording,
    endAndSave,
    sessionStatus,
    recordingBufferLength: recordingBuffer.length,
  };
}
