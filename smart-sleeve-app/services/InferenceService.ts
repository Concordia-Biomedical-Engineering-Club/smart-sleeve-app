import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

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

    public async runInference(buffer: any[]): Promise<{ prob: number | null, isNewRep: boolean, mlState: 'IDLE' | 'ACTIVE' }> {
        if (!this.model || buffer.length < 50) {
            return { prob: null, isNewRep: false, mlState: 'IDLE' };
        }

        // FEATURE EXTRACTION: Mean Absolute Value (MAV)
        const mav = new Float32Array(8);
        for (let j = 0; j < 8; j++) {
            let sumAbs = 0;
            for (let i = 0; i < buffer.length; i++) {
                sumAbs += Math.abs(buffer[i].channels[j]);
            }
            mav[j] = sumAbs / buffer.length;
        }

        try {
            const output = await this.model.run([mav]);
            const probArr = output[0] as Float32Array;
            const prob = probArr[0];
            this.currentProb = prob;

            let isNewRep = false;
            // Base thresholds for initial integration
            if (this.state === 'IDLE' && prob > 0.80) {
                this.state = 'ACTIVE';
            } else if (this.state === 'ACTIVE' && prob < 0.40) {
                this.state = 'IDLE';
                isNewRep = true;
            }

            return { prob, isNewRep, mlState: this.state };
        } catch (e) {
            console.error("Inference Error:", e);
            return { prob: null, isNewRep: false, mlState: 'IDLE' };
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
