import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { EMGData } from './SleeveConnector/ISleeveConnector';

class InferenceService {
    private static instance: InferenceService;
    private model: TensorflowModel | null = null;
    private state: 'IDLE' | 'ACTIVE' = 'IDLE';
    private currentProb: number = 0;

    private constructor() { }

    public static getInstance(): InferenceService {
        if (!InferenceService.instance) {
            InferenceService.instance = new InferenceService();
        }
        return InferenceService.instance;
    }

    public async loadModel(modelAsset: any) {
        if (this.model) return;
        try {
            this.model = await loadTensorflowModel(modelAsset);
            console.log("TFLite Model loaded successfully!");
        } catch (e) {
            console.error("Failed to load tflite model:", e);
        }
    }

    public async runInference(buffer: EMGData[]): Promise<{ prob: number | null, isNewRep: boolean, mlState: 'IDLE' | 'ACTIVE', maxMav: number }> {
        if (!this.model || buffer.length < 10) {
            return { prob: null, isNewRep: false, mlState: 'IDLE', maxMav: 0 };
        }

        // FEATURE EXTRACTION: Mean Absolute Value (MAV) with DC Removal
        const mav = new Float32Array(8);
        for (let j = 0; j < 8; j++) {
            // 1. Calculate Mean (DC Offset / Low-freq drift)
            let mean = 0;
            const windowSize = buffer.length;
            for (let i = 0; i < windowSize; i++) {
                mean += buffer[i].channels[j];
            }
            mean /= windowSize;

            // 2. Calculate MAV on zero-centered signal
            let sumAbs = 0;
            for (let i = 0; i < windowSize; i++) {
                sumAbs += Math.abs(buffer[i].channels[j] - mean);
            }
            mav[j] = sumAbs / windowSize;
        }

        // Find Max MAV for debug
        const maxMav = Math.max(...Array.from(mav));

        try {
            const output = await this.model.run([mav]);
            const probArr = output[0] as Float32Array;
            const prob = probArr[0];
            this.currentProb = prob;

            let isNewRep = false;
            // State Machine Logic (Adjusted based on live testing for fatigue)
            if (this.state === 'IDLE' && prob > 0.80) {
                this.state = 'ACTIVE';
                console.log(`ML State: 🚀 ACTIVE (Prob: ${prob.toFixed(2)})`);
            } else if (this.state === 'ACTIVE' && prob < 0.10) {
                this.state = 'IDLE';
                isNewRep = true;
                console.log(`ML State: ✅ IDLE - REP DETECTED! (Prob: ${prob.toFixed(2)})`);
            }

            return { prob, isNewRep, mlState: this.state, maxMav };
        } catch (e) {
            console.error("Inference Error:", e);
            return { prob: null, isNewRep: false, mlState: 'IDLE', maxMav: 0 };
        }
    }

    public getCurrentProb(): number {
        return this.currentProb;
    }

    public resetState() {
        this.state = 'IDLE';
        this.currentProb = 0;
    }
}

export default InferenceService.getInstance();
