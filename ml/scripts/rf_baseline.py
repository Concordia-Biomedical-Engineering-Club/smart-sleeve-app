import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import os

def check_separability():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_path = os.path.join(base_dir, 'data', 'train.csv')
    
    df = pd.read_csv(train_path)
    
    # Simple windowing with MAV
    window_size = 50
    step = 50
    X = []
    y = []
    
    channels = [f'Ch{i}' for i in range(1, 9)]
    data = df[channels].values
    labels = df['Label'].values
    
    for i in range(0, len(data) - window_size + 1, step):
        window = data[i : i + window_size]
        mav = np.mean(np.abs(window), axis=0)
        
        label = 1 if np.mean(labels[i : i + window_size]) > 0.5 else 0
        X.append(mav)
        y.append(label)
        
    X = np.array(X)
    y = np.array(y)
    
    print(f"Dataset shape: {X.shape}")
    print(f"Class distribution: {np.bincount(y)}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    
    y_pred = rf.predict(X_test)
    
    print("\n--- Random Forest Baseline Results ---")
    print(classification_report(y_test, y_pred))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Print sample and prediction
    print("\nSample MAVs and Predictions (First 10 of Test Set):")
    for i in range(10):
        print(f"MAV: {X_test[i][0]:.4f} | True: {y_test[i]} | Pred: {y_pred[i]}")

if __name__ == "__main__":
    check_separability()
