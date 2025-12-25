# Smart Rehabilitation Knee Sleeve App

A professional, data-driven rehabilitation platform developed by the **Concordia Biomedical Engineering Club (BEC)** for the **True North Biomedical Competition 2025-2026**.

---

## 🌟 Vision Statement
To create an intelligent, data-driven rehabilitation platform that transforms subjective recovery assessment into objective, measurable progress tracking through advanced EMG signal processing and machine learning algorithms.

---

## 🏗️ Technical Architecture

The system operates across four integrated layers to ensure high performance and sub-50ms latency:

1.  **Hardware Layer**: ESP32-S3 microcontroller interfacing with 8-channel EMG and 9-DOF IMU sensors via BLE 5.0.
2.  **Edge Computing Layer**: Real-time signal filtering (Butterworth 20-500Hz) and feature extraction (RMS, MAV, WL, ZC) performed at the sensor level.
3.  **Mobile Application**: Cross-platform React Native app for real-time visualization, local data storage (SQLite/Redux), and on-device ML inference (TensorFlow Lite).
4.  **Cloud Backend**: Firebase infrastructure for secure authentication, clinical data sharing, and HIPAA-compliant storage.

---

## 🛠️ Tech Stack

- **Mobile**: React Native 0.73+ (Expo SDK 54), TypeScript, Redux Toolkit, React Navigation 6.
- **DSP**: Custom Biquad IIR filtering pipeline (Notch + Bandpass).
- **ML Engine**: TensorFlow Lite for on-device repetition counting and fatigue detection.
- **Backend**: Firebase (Auth, Firestore, Cloud Functions).
- **UI/UX**: Custom Design System with Dark Mode support and `react-native-chart-kit`.

---

## 🚧 Development Status & Roadmap

### ✅ Phase 1: Foundation (Completed)
- [x] Initial React Native & Expo setup.
- [x] Core state management (Redux) and Navigation architecture.
- [x] Static UI layouts for Dashboard and Milestones.
- [x] Authentication flow (Firebase).

### 🔄 Phase 2: Signal Processing & Integration (Current)
- [x] **Mock BLE Service**: Full hardware simulation for development.
- [x] **DSP Pipeline**: 60Hz Notch and 20-500Hz Bandpass filters active.
- [x] **Real-time Visualization**: High-frequency graphing in the Test BLE diagnostics.
- [ ] **Real BLE Integration**: Connecting to physical ESP32-S3 hardware.
- [ ] **Bilateral Comparison**: Implementing side-by-side leg activation analytics.

### 📅 Phase 3: ML Intelligence (Upcoming)
- [ ] On-device rep counting via 1D-CNN.
- [ ] Exercise recognition (LSTM-based).
- [ ] Real-time fatigue detection algorithms.

### 🚀 Phase 4: Refinement (Future)
- [ ] Automatic cloud backup & Clinical portal.
- [ ] PDF report generation for physiotherapists.
- [ ] HIPAA/Health Canada compliance hardening.

---

## 🚀 Getting Started

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/Concordia-Biomedical-Engineering-Club/smart-sleeve-app.git
    cd smart-sleeve-app/smart-sleeve-app
    npm install
    ```
2.  **Environment**: Create a `.env` file based on `.env.example` with your Firebase credentials.
3.  **Run**:
    ```bash
    npm start
    ```
    Scan the QR code with **Expo Go** to test on your device.

---

## 🧪 Testing & Quality
- **Unit Tests**: `npm test` runs 50+ cases covering signal accuracy and hardware logic.
- **Diagnostics**: Use the **Test BLE** tab to manually verify the signal processor's effect on simulated noise and motion artifacts.

---
**Concordia University - Biomedical Engineering Club**
*Transforming ACL recovery through engineering excellence.*