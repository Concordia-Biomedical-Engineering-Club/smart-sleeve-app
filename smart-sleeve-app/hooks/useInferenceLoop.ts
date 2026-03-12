import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { inferenceUpdate } from '../store/deviceSlice';
import InferenceService from '../services/InferenceService';

export const useInferenceLoop = () => {
    const dispatch = useDispatch();
    const emgBuffer = useSelector((state: RootState) => state.device.emgBuffer);
    const workoutPhase = useSelector((state: RootState) => state.device.workout.phase);
    const sessionStatus = useSelector((state: RootState) => state.device.sessionStatus);
    
    // Using a ref for the interval to avoid memory leaks
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only run inference if a workout is active
        const isActive = workoutPhase === 'ACTIVE_WORK' && sessionStatus !== 'IDLE';
        
        if (isActive) {
            if (!intervalRef.current) {
                intervalRef.current = setInterval(async () => {
                    // Extract the last 10 samples (200ms window)
                    const window = emgBuffer.slice(-10);
                    
                    const result = await InferenceService.runInference(window);
                    
                    if (result.prob !== null) {
                        dispatch(inferenceUpdate({
                            prob: result.prob,
                            isNewRep: result.isNewRep,
                            mlState: result.mlState,
                            maxMav: result.maxMav
                        }));
                    }
                }, 100); // 10Hz inference
            }
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                InferenceService.resetState();
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [emgBuffer, workoutPhase, sessionStatus, dispatch]);
};
