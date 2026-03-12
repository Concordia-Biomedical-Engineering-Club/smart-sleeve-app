import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import InferenceService from '../services/InferenceService';

export const useInferenceLoop = () => {
    const emgBuffer = useSelector((state: RootState) => state.device.emgBuffer);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!intervalRef.current) {
            intervalRef.current = setInterval(async () => {
                // Placeholder for feature extraction
                const dummy = new Float32Array(8).fill(0);
                const prob = await InferenceService.runInference(dummy);
                console.log("ML Prob:", prob);
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [emgBuffer]);
};
