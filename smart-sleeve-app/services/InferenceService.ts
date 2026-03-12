import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

class InferenceService {
    private static instance: InferenceService;
    private model: TensorflowModel | null = null;

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

    public async runInference(inputData: Float32Array): Promise<number | null> {
        if (!this.model) return null;
        try {
            const output = await this.model.run([inputData]);
            const probArr = output[0] as Float32Array;
            return probArr[0];
        } catch (e) {
            console.error("Inference Error:", e);
            return null;
        }
    }
}

export default InferenceService.getInstance();
