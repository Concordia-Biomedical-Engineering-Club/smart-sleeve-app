import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { inferenceUpdate } from '../store/deviceSlice';
import InferenceService from '../services/InferenceService';

export const useInferenceLoop = () => {
    const dispatch = useDispatch();
    const emgBuffer = useSelector((state: RootState) => state.device.emgBuffer);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!intervalRef.current) {
            intervalRef.current = setInterval(async () => {
                // Extract last 50 samples
                const window = emgBuffer.slice(-50);
                if (window.length < 50) return;

                const result = await InferenceService.runInference(window);
                
                if (result.prob !== null) {
                    dispatch(inferenceUpdate({
                        prob: result.prob,
                        isNewRep: result.isNewRep,
                        mlState: result.mlState,
                        maxMav: 0 // Placeholder for refinement task
                    }));
                }
            }, 100);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [emgBuffer, dispatch]);
};
