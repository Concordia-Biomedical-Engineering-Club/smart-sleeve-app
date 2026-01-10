# 🧠 Smart Sleeve ML Pipeline

This directory contains the machine learning pipeline for the Smart Rehabilitation Knee Sleeve. It handles data generation, model training, evaluation, and conversion to TensorFlow Lite for the mobile app.

> **⚠️ PHASE 3 STATUS: SYNTHETIC MODE**
> Due to pending hardware delivery, this pipeline currently operates on **Synthetic Data** (Simulated Sine Waves vs. Gaussian Noise).
> **Objective:** Prove the end-to-end software architecture (Data -> Model -> TFLite -> App Inference) works before physical sensors arrive.

---

## 📂 Directory Structure

```text
ml/
├── data/                  # Raw CSV files (Git-ignored except samples)
│   ├── synthetic_train.csv
│   └── synthetic_test.csv
├── models/                # Saved models (.h5, .tflite)
├── notebooks/             # Jupyter notebooks for exploration/training
├── scripts/               # Utility scripts (generation, processing)
│   └── generate_data.py   # Script to create synthetic sine waves
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

---

## ⚡ Quick Start

### 1. Environment Setup

We recommend using a virtual environment to avoid conflicts.

```bash
# Navigate to ml folder
cd ml

# Create virtual environment
python -m venv venv

# Activate (Mac/Linux)
source venv/bin/activate
# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Generate Synthetic Data (Task #25)

Since we cannot collect real EMG data yet, run this script to generate "Fake Reps" (Sine Waves) and "Fake Rest" (Noise).

```bash
python scripts/generate_data.py
```

_Output:_ Creates `data/synthetic_train.csv` and `data/synthetic_test.csv`.

### 3. Train the Model (Task #66)

Train the 1D-CNN/LSTM classifier on the generated data.

```bash
# Launch Jupyter to run the training notebook interactively
jupyter notebook notebooks/train_rep_counter.ipynb

# OR run the training script directly (if available)
python scripts/train.py
```

---

## 🤖 Model Specifications (The Contract)

**Mobile Developers:** This is the input/output shape your `InferenceService.ts` must handle.

| Parameter        | Value             | Description                                 |
| :--------------- | :---------------- | :------------------------------------------ |
| **Model Type**   | Binary Classifier | 1D-CNN or LSTM                              |
| **Input Shape**  | `[1, 50, 8]`      | Batch size 1, **50 Time Steps**, 8 Channels |
| **Data Type**    | `Float32`         | Normalized sensor data                      |
| **Output Shape** | `[1, 1]`          | Single probability score (0.0 - 1.0)        |
| **Threshold**    | `> 0.8`           | Consider > 0.8 as "Active Rep"              |

**Sampling Logic:**

- The app should buffer **50 samples** (approx 1 second of data at 50Hz).
- Slide the window by **10 samples** for the next inference (Overlapping Window).

---

## 📲 Deployment / Handoff

Once the model is trained and converted:

1.  **Locate the file:** `ml/models/rep_counter.tflite`
2.  **Verify size:** Must be `< 5MB` (Target: < 500KB).
3.  **Handoff:** Copy this file into the mobile application assets folder:
    ```bash
    cp ml/models/rep_counter.tflite ../mobile/assets/models/
    ```
4.  **Notify:** Ping the Mobile Dev that a new model version is ready.

---

## 🛠️ Requirements (`requirements.txt`)

_Ensure your `requirements.txt` includes at least:_

```text
tensorflow>=2.10.0
numpy
pandas
scikit-learn
matplotlib
jupyter
```
