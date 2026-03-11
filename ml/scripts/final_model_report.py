"""
final_model_report.py
-----------------------------------------------------
Definitive verification for Issue #66.
Tests the trained TFLite model against REST and ACTIVE samples.
"""

import numpy as np
import tensorflow as tf
import pandas as pd
import os

def run_report():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, 'models', 'rep_counter.tflite')
    data_path = os.path.join(base_dir, 'data', 'test.csv')
    
    if not os.path.exists(model_path):
        print(f"ERROR: Model not found at {model_path}")
        return

    # Load TFLite model
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # Load data
    df = pd.read_csv(data_path)
    channels = [f'Ch{i}' for i in range(1, 9)]
    
    # Separate classes for clean testing
    rest_samples = df[df['Label'] == 0]
    active_samples = df[df['Label'] == 1]
    
    # Test 100 windows of each
    def test_class(samples, name):
        correct = 0
        total = 0
        probs = []
        for i in range(0, min(len(samples), 5000) - 50, 50):
            window = samples.iloc[i:i+50][channels].values
            mav = np.mean(np.abs(window), axis=0).astype(np.float32)
            
            # Reshape for model [1, 1, 8]
            inp = mav.reshape(1, 1, 8)
            
            interpreter.set_tensor(input_details[0]['index'], inp)
            interpreter.invoke()
            prob = interpreter.get_tensor(output_details[0]['index'])[0][0]
            probs.append(prob)
            
            if name == "REST" and prob < 0.2: correct += 1
            if name == "ACTIVE" and prob > 0.8: correct += 1
            total += 1
        
        acc = (correct / total) * 100 if total > 0 else 0
        avg_prob = np.mean(probs)
        print(f"Class {name:6} | Accuracy: {acc:6.2f}% | Avg Prob: {avg_prob:.4f}")
        return acc

    print("--- 📊 ISSUE #66 FINAL MODEL REPORT 📊 ---")
    rest_acc = test_class(rest_samples, "REST")
    active_acc = test_class(active_samples, "ACTIVE")
    
    overall = (rest_acc + active_acc) / 2
    print(f"-------------------------------------------")
    print(f"OVERALL MODEL ACCURACY: {overall:.2f}%")
    
    if overall > 95:
        print("\n✅ ISSUE #66 COMPLETE: Model is ready for mobile integration.")
    else:
        print("\n❌ ISSUE #66 INCOMPLETE: Model needs more training.")

if __name__ == "__main__":
    run_report()
