import numpy as np
import pandas as pd
import os
import time
from scipy import signal

# Configuration
DATA_DIR = os.path.join(os.path.dirname(__file__), '../data')
os.makedirs(DATA_DIR, exist_ok=True)

SAMPLE_RATE = 50  # Hz (matches BLE transmission rate)
DURATION_SECONDS = 60 * 10  # 10 minutes of data
TOTAL_SAMPLES = SAMPLE_RATE * DURATION_SECONDS
CHANNELS = 8

def apply_emg_filter(data, fs, lowcut=5.0):
    """Simple high-pass filter to remove baseline drift in the script."""
    nyq = 0.5 * fs
    low = lowcut / nyq
    b, a = signal.butter(2, low, btype='high')
    return signal.filtfilt(b, a, data, axis=0)

def generate_synthetic_data(filename):
    print(f"Generating realistic {filename}...")
    
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
    min_rep_duration = 2 * SAMPLE_RATE  # 2 seconds
    max_rep_duration = 4 * SAMPLE_RATE  # 4 seconds
    min_rest_duration = 2 * SAMPLE_RATE
    max_rest_duration = 5 * SAMPLE_RATE
    
    baseline_noise_std = 0.05
    
    i = 0
    while i < TOTAL_SAMPLES:
        # Determine duration of current state
        if current_state == 0:
            duration = np.random.randint(min_rest_duration, max_rest_duration)
        else:
            duration = np.random.randint(min_rep_duration, max_rep_duration)
            
        end_idx = min(i + duration, TOTAL_SAMPLES)
        actual_duration = end_idx - i
        
        if actual_duration <= 0:
            break
            
        if current_state == 0:
            # Generate REST (Stationary Gaussian Noise + Drift)
            # We add drift and then filter it out later to ensure baseline is stable
            drift = 0.3 * np.sin(2 * np.pi * 0.1 * t_sec[i:end_idx])[:, np.newaxis]
            noise = np.random.normal(0, baseline_noise_std, (actual_duration, CHANNELS))
            data[i:end_idx, :] = noise + drift
            labels[i:end_idx] = 0
        else:
            # Generate EXERCISE (Muscle Sizzle Bursts)
            # Create a Hanning-style envelope for smooth contraction/relaxation
            envelope = np.hanning(actual_duration)
            
            for ch in range(CHANNELS):
                # Randomized amplitude for each channel to simulate electrode placement
                burst_amp = np.random.uniform(0.3, 1.2)
                # "Muscle Sizzle" is high freq noise modulated by the envelope
                sizzle = np.random.normal(0, burst_amp, actual_duration) * envelope
                # Add baseline noise and drift
                drift = 0.5 * np.sin(2 * np.pi * 0.2 * t_sec[i:end_idx])
                data[i:end_idx, ch] = sizzle + np.random.normal(0, baseline_noise_std, actual_duration) + drift
                
            labels[i:end_idx] = 1
            
        # Switch state
        current_state = 1 - current_state
        i = end_idx

    # Apply High-Pass Filter (5Hz) to match the app's signal processing
    # This removes the "drift" we just added
    print("Applying signal filtering...")
    data_filtered = apply_emg_filter(data, SAMPLE_RATE)

    # Create DataFrame
    cols_map = {'Timestamp': timestamps}
    for ch in range(CHANNELS):
        cols_map[f'Ch{ch+1}'] = data_filtered[:, ch]
    cols_map['Label'] = labels
    
    df = pd.DataFrame(cols_map)
    
    # Save to CSV
    filepath = os.path.join(DATA_DIR, filename)
    df.to_csv(filepath, index=False)
    print(f"Saved {filepath} with shape {df.shape}")

if __name__ == "__main__":
    generate_synthetic_data('train.csv')
    generate_synthetic_data('test.csv')
