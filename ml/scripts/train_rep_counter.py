import os
import sys
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Flatten, Dense, Dropout
from sklearn.model_selection import train_test_split

def load_data(file_path):
    print(f"Loading {file_path}...")
    df = pd.read_csv(file_path)
    return df

def sliding_window(df, window_size=50, step=10):
    print(f"Creating sliding windows (size={window_size}, step={step})...")
    X = []
    y = []
    
    # Extract channel data and labels
    # Channels are Ch1 to Ch8
    channels = [f'Ch{i}' for i in range(1, 9)]
    data = df[channels].values
    labels = df['Label'].values
    
    num_samples = len(data)
    
    for i in range(0, num_samples - window_size + 1, step):
        window_raw = data[i : i + window_size]
        
        # FEATURE EXTRACTION: Use Mean Absolute Value (MAV) as a smoother feature
        # We can still use 1D-CNN, but let's give it a better input
        mav = np.mean(np.abs(window_raw), axis=0)
        
        # Label for the window: mode of the labels
        window_label = np.mean(labels[i : i + window_size])
        label = 1 if window_label > 0.5 else 0
        
        # For 1D-CNN, we still want a "time" dimension, even if size 1
        X.append(mav[np.newaxis, :]) 
        y.append(label)
        
    return np.array(X), np.array(y)

def build_model(input_shape):
    print(f"Building simple MLP model with input shape {input_shape}...")
    model = Sequential([
        Flatten(input_shape=input_shape),
        Dense(16, activation='relu'),
        Dense(8, activation='relu'),
        Dense(1, activation='sigmoid')
    ])
    
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    train_path = os.path.join(data_dir, 'train.csv')
    test_path = os.path.join(data_dir, 'test.csv')
    
    train_df = load_data(train_path)
    test_df = load_data(test_path)
    
    # Process training data
    X_train_full, y_train_full = sliding_window(train_df)
    
    # Split mostly for validation while training
    X_train, X_val, y_train, y_val = train_test_split(X_train_full, y_train_full, test_size=0.2, random_state=42)
    
    print(f"X_train[0]: {X_train[0]}")
    print(f"y_train[0]: {y_train[0]}")
    print(f"Shape of X_train: {X_train.shape}")
    print(f"Counts in y_train: {np.bincount(y_train)}")

    # Process test data
    X_test, y_test = sliding_window(test_df)
    
    input_shape = (X_train.shape[1], X_train.shape[2]) # (1, 8)
    
    model = build_model(input_shape)
    
    print("Training the model...")
    # Add early stopping
    early_stop = tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
        
    model.fit(X_train, y_train, epochs=50, batch_size=16, validation_data=(X_val, y_val), callbacks=[early_stop], verbose=1)
    
    print("Evaluating on test set...")
    loss, accuracy = model.evaluate(X_test, y_test)
    print(f"Test Accuracy: {accuracy * 100:.2f}%")
    
    if accuracy < 0.95:
        print("Warning: Accuracy is below 95% target.")
        
    h5_path = os.path.join(models_dir, 'rep_counter.h5')
    tflite_path = os.path.join(models_dir, 'rep_counter.tflite')
    
    print(f"Saving Keras model to {h5_path}...")
    model.save(h5_path)
    
    print(f"Converting to TFLite and saving to {tflite_path}...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    # Default optimizations
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()
    
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
        
    file_size_kb = os.path.getsize(tflite_path) / 1024
    print(f"TFLite model saved perfectly. Size: {file_size_kb:.2f} KB")

if __name__ == "__main__":
    main()
