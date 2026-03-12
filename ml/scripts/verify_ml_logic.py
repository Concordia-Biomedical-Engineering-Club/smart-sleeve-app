"""
verify_ml_logic.py
-----------------------------------------------------
A standalone script to verify the rep counting logic 
by simulating the same data and state machine used in 
the mobile app's InferenceService.ts.
-----------------------------------------------------
"""

import numpy as np
import tensorflow as tf
import pandas as pd

def simulate_inference(model_path, data_file):
    # Load the TFLite model
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # Load test data
    df = pd.read_csv(data_file)
    # We only need the first 8 channels
    data = df.iloc[:, :8].values
    labels = df.iloc[:, 9].values # Actual label (1 for rep, 0 for rest)

    state = 'IDLE'
    rep_count = 0
    correct_detections = 0
    total_checks = 0

    print(f"{'Sample':<10} | {'Prob':<6} | {'Pred State':<10} | {'True Label':<10}")
    print("-" * 50)

    # Slide a window of 50 samples, step 50 (non-overlapping for clearer logs)
    for i in range(0, len(data) - 50, 50):
        window_raw = data[i:i+50].astype(np.float32)
        
        # MAV FEATURE EXTRACTION
        mav = np.mean(np.abs(window_raw), axis=0)
        window = np.expand_dims(mav, axis=0) 
        window = np.expand_dims(window, axis=0) # Add batch and time dimensions [1, 1, 8]

        interpreter.set_tensor(input_details[0]['index'], window)
        interpreter.invoke()
        
        prob = interpreter.get_tensor(output_details[0]['index'])[0][0]
        true_label = labels[i+25] # Mid-window label
        
        pred_label = 1 if prob > 0.5 else 0
        if pred_label == true_label:
            correct_detections += 1
        total_checks += 1

        # State Machine Logic (Must match InferenceService.ts)
        # Note: In the synthetic data, one "rep" is 100 samples (2 seconds).
        # Our state machine counts a rep when it returns to IDLE.
        current_state = state
        if state == 'IDLE' and prob > 0.8:
            state = 'ACTIVE'
        elif state == 'ACTIVE' and prob < 0.2:
            state = 'IDLE'
            rep_count += 1
        
        # Log every 500 samples to keep output readable
        if i % 500 == 0:
            print(f"{i:<10} | {prob:<6.2f} | {state:<10} | {true_label:<10}")

    accuracy = (correct_detections / total_checks) * 100 if total_checks > 0 else 0
    return rep_count, accuracy

if __name__ == "__main__":
    model = "ml/models/rep_counter.tflite"
    test_csv = "ml/data/test.csv"
    
    print(f"--- Verifying AI Logic with {model} ---")
    reps, accuracy = simulate_inference(model, test_csv)
    
    print("\n--- Final Verification Result ---")
    print(f"Total Repetitions (Completed Cycles): {reps}")
    print(f"Classification Accuracy: {accuracy:.2f}%")
    
    if accuracy > 90:
        print("✅ SUCCESS: The AI is correctly classifying EMG signals!")
    else:
        print("⚠️ WARNING: Accuracy is lower than expected. Model may need retraining.")
