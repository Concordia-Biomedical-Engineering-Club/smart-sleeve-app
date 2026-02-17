import numpy as np
import pandas as pd
import os
import time

# Configuration
DATA_DIR = os.path.join(os.path.dirname(__file__), '../data')
os.makedirs(DATA_DIR, exist_ok=True)

SAMPLE_RATE = 50  # Hz
DURATION_SECONDS = 60 * 10 # 10 minutes of data
TOTAL_SAMPLES = SAMPLE_RATE * DURATION_SECONDS
CHANNELS = 8

def generate_synthetic_data(filename):
    print(f"Generating {filename}...")
    
    # Time vector
    t_sec = np.linspace(0, DURATION_SECONDS, TOTAL_SAMPLES)
    
    # Generate Timestamp (ms) starting from now
    start_time_ms = int(time.time() * 1000)
    timestamps = start_time_ms + (t_sec * 1000).astype(int)
    
    # Initialize data array [samples, channels]
    data = np.zeros((TOTAL_SAMPLES, CHANNELS))
    labels = np.zeros(TOTAL_SAMPLES, dtype=int)
    
    # State: 0 = Rest, 1 = Rep
    current_state = 0
    
    # Parameters for simulation
    min_rep_duration = 2 * SAMPLE_RATE # 2 seconds
    max_rep_duration = 4 * SAMPLE_RATE # 4 seconds
    min_rest_duration = 2 * SAMPLE_RATE
    max_rest_duration = 5 * SAMPLE_RATE
    
    i = 0
    while i < TOTAL_SAMPLES:
        # Determine duration of current state
        if current_state == 0:
            duration = np.random.randint(min_rest_duration, max_rest_duration)
        else:
            duration = np.random.randint(min_rep_duration, max_rep_duration)
            
        # Clip duration to stay within bounds
        end_idx = min(i + duration, TOTAL_SAMPLES)
        actual_duration = end_idx - i
        
        if actual_duration <= 0:
            break
            
        segment_t = t_sec[i:end_idx]
        
        if current_state == 0:
            # Generate Noise (Rest)
            # Gaussian noise (Label 0)
            noise = np.random.normal(0, 0.05, (actual_duration, CHANNELS))
            data[i:end_idx, :] = noise
            labels[i:end_idx] = 0
        else:
            # Generate Sine Waves (Exercise - Label 1)
            freq = np.random.uniform(0.5, 1.5)
            phase_offsets = np.random.uniform(0, 2*np.pi, CHANNELS)
            amplitudes = np.random.uniform(0.5, 1.0, CHANNELS)
            
            for ch in range(CHANNELS):
                wave = amplitudes[ch] * np.sin(2 * np.pi * freq * segment_t + phase_offsets[ch])
                wave += np.random.normal(0, 0.05, actual_duration)
                data[i:end_idx, ch] = wave
                
            labels[i:end_idx] = 1
            
        # Switch state
        current_state = 1 - current_state
        i = end_idx

    # Create DataFrame
    # Columns: Timestamp, Ch1..Ch8, Label
    cols_map = {'Timestamp': timestamps}
    for ch in range(CHANNELS):
        cols_map[f'Ch{ch+1}'] = data[:, ch]
    cols_map['Label'] = labels
    
    df = pd.DataFrame(cols_map)
    
    # Save to CSV
    filepath = os.path.join(DATA_DIR, filename)
    df.to_csv(filepath, index=False)
    print(f"Saved {filepath} with shape {df.shape}")

if __name__ == "__main__":
    generate_synthetic_data('train.csv')
    generate_synthetic_data('test.csv')
