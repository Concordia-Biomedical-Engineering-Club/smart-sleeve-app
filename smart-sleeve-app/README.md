# Smart Rehabilitation Knee Sleeve App

A professional React Native application developed by the **Concordia Biomedical Engineering Club (BEC)** to interface with a smart knee sleeve for real-time rehabilitation monitoring.

## 📋 Project Overview
This application tracks 8-channel EMG (muscle activity) and IMU (joint orientation) data from a smart sleeve. It features a robust signal processing pipeline to clean raw data and a modern dashboard to visualize patient progress.

## 🚀 Key Features
- **Live Signal Processing**: Built-in DSP engine for real-time data cleaning.
  - **60Hz Notch Filter**: Removes electrical hum from power outlets.
  - **20Hz - 500Hz Bandpass Filter**: Isolates muscle action potentials while removing slow motion artifacts.
- **Hardware Simulation**: Full Mock BLE service allowing development and testing without physical hardware.
- **Health Dashboard**: Premium UI featuring circular progress trackers, activity segments, and milestone badges.
- **Test Suite**: Comprehensive unit tests (50+ cases) for signal accuracy and hardware logic.
- **Diagnostics Screen**: Real-time line graphs to visualize filtered vs. raw EMG signals.

## 🛠 Tech Stack
- **Framework**: [Expo](https://expo.dev) (SDK 54) / React Native
- **Language**: TypeScript
- **State Management**: Redux Toolkit & Redux Persist
- **Backend/Auth**: Firebase JS SDK (Authentication & Firestore)
- **Navigation**: Expo Router (File-based navigation)
- **Charts**: React Native Chart Kit

---

## ⚙️ Environment Setup
Follow these exact steps to get your development environment running in minutes.

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js**: Version 18.x or higher. [Download here](https://nodejs.org/).
- **Git**: For cloning the repository.
- **Expo Go App**: Install the [Expo Go](https://expo.dev/go) app on your physical mobile device.

### 2. Installation
Clone the repository and enter the project folder:
```bash
git clone https://github.com/Concordia-Biomedical-Engineering-Club/smart-sleeve-app.git
cd smart-sleeve-app/smart-sleeve-app
npm install
```

### 3. Environment Variables
The app uses Firebase for Authentication. You must configure your own keys:
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and replace the placeholder values with your Firebase Project credentials.

### 4. Running the Development Server
```bash
npm start
```
- **Physical Device**: Open your camera (iOS) or the Expo Go app (Android) and scan the QR code displayed in your terminal.
- **Emulator**: Press `a` for Android Emulator or `i` for iOS Simulator.
- **Web**: Press `w` to open in your browser.

---

## 🧪 Development Workflows

### Testing
We use Jest for unit testing logic and filters. Run tests to ensure everything is stable:
```bash
npm test
```

### Linting
To maintain code quality, run the linter before submitting PRs:
```bash
npm run lint
```

### Signal Verification
To test the signal processing manually:
1. Navigate to the **Test BLE** tab in the app.
2. Tap **Connect** to start the mock stream.
3. Toggle the **Filters ON/OFF** button.
4. Observe the live `LineChart` and numeric values to see the noise reduction in real-time.

---

## 📁 Project Structure
- **`/app`**: Routing and screen definitions (Expo Router).
- **`/services`**: The "brains" of the app.
  - `SignalProcessing/`: Biquad IIR filter implementations.
  - `MockBleService/`: Emulates the hardware protocol.
- **`/components`**: Reusable UI elements, including specialized dashboard cards.
- **`/constants`**: Design system tokens (colors, topography, shadows).
- **`/store`**: Redux logic for user data and persistent settings.

---
**Concordia University - Biomedical Engineering Club**
Helping you move better, one step at a time.
