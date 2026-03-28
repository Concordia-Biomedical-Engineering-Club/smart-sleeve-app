import tensorflow as tf
import numpy as np
import pandas as pd
import os

def debug_weights():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    h5_path = os.path.join(base_dir, 'models', 'rep_counter.h5')
    train_path = os.path.join(base_dir, 'data', 'train.csv')
    
    model = tf.keras.models.load_model(h5_path)
    df = pd.read_csv(train_path)
    
    # Get one REST and one ACTIVE sample
    channels = [f'Ch{i}' for i in range(1, 9)]
    rest_raw = df[df['Label'] == 0].iloc[0:50][channels].values
    active_raw = df[df['Label'] == 1].iloc[0:50][channels].values
    
    rest_mav = np.mean(np.abs(rest_raw), axis=0)[np.newaxis, np.newaxis, :]
    active_mav = np.mean(np.abs(active_raw), axis=0)[np.newaxis, np.newaxis, :]
    
    print(f"REST MAV: {rest_mav}")
    print(f"ACTIVE MAV: {active_mav}")
    
    rest_pred = model.predict(rest_mav)
    active_pred = model.predict(active_mav)
    
    print(f"Prediction for REST: {rest_pred}")
    print(f"Prediction for ACTIVE: {active_pred}")
    
    # Inspect weights
    for i, layer in enumerate(model.layers):
        if hasattr(layer, 'get_weights'):
            weights = layer.get_weights()
            if len(weights) > 0:
                print(f"Layer {i} ({layer.name}) weights mean: {np.mean(weights[0]):.6f}, std: {np.std(weights[0]):.6f}")

if __name__ == "__main__":
    debug_weights()
