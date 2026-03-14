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

### 5. Native Device Builds

This project uses `react-native-ble-plx`, so full BLE testing should use a native development build.

- **Android**:
  ```bash
  adb devices -l
  npx expo run:android --device "<ANDROID_MODEL>"
  ```
- **iPhone**:
  ```bash
  xcrun devicectl list devices
  npx expo run:ios --device "<IPHONE_NAME>"
  ```

If the installed dev build opens with `No script URL provided`, start Metro for the dev client:

```bash
npx expo start --dev-client
```

If the phone cannot reach Metro reliably, use:

```bash
npx expo start --dev-client --tunnel
```

### 6. Device Preparation

- **Android phone**:
  - Enable Developer options.
  - Enable USB debugging.
  - Accept the USB debugging prompt.
- **iPhone**:
  - Trust the computer.
  - Enable `Settings > Privacy & Security > Developer Mode`.
  - Reboot and confirm **Turn On** after reboot.
  - On macOS, configure Xcode signing before using `npx expo run:ios --device`.

Windows users can build locally for Android, but not for iPhone. Native iPhone builds require macOS + Xcode.

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

### Real Hardware Bring-up

For physical sleeve testing, use this short checklist:

1. Flash [firmware/esp32_ble_sleeve.ino](firmware/esp32_ble_sleeve.ino) to the SparkFun ESP32 Thing Plus.
2. Set `EXPO_PUBLIC_USE_MOCK_HARDWARE=false` in `.env`.
3. Start Metro with `npx expo start --dev-client`.
4. Install and open a native dev build with `npx expo run:ios --device "<IPHONE_NAME>"` or `npx expo run:android --device "<ANDROID_MODEL>"`.
5. Open the BLE debug screen and confirm:

- `Requested: real`
- `Active: real`
- `Phase: connected`
- EMG and IMU packet counters are increasing
- both BLE characteristics are listed

6. If the connection fails, use the BLE debug counters plus the hardware guide to distinguish checksum mismatch, parser mismatch, transport failure, and discovery failure.

The full wiring, firmware, and troubleshooting workflow is documented in [../docs/hardware_setup_guide.md](../docs/hardware_setup_guide.md).

### Shareable Android APK For Teammates

If teammates should install the app without Android Studio, use an EAS Android APK build instead of a local dev build.

1. Install EAS CLI once:

```bash
npm install -g eas-cli
```

2. Log in to Expo:

```bash
eas login
```

3. From the app folder, build the Android APK:

```bash
cd smart-sleeve-app/smart-sleeve-app
eas build --platform android --profile preview
```

4. Download the generated APK from the Expo build link.
5. Send that APK or link to teammates so they can install it directly on Android.

Notes:

- The `preview` build profile in `eas.json` is configured to output an APK.
- This app already declares the Android BLE permissions required for sleeve testing.
- Use `eas build` for teammate installs and `npx expo run:android` for local debugging.

### iOS: Dev Build vs Installable App

For iPhone, there are two different workflows:

1. **Native dev build (`npx expo run:ios --device`)**
  - Requires Metro to be running whenever you open the app.
  - Start with `npx expo start --dev-client` (or `--tunnel` if needed).
2. **Installable iOS build (no dev server required)**
  - Build with EAS and install the signed output on device.
  - Command:

```bash
cd smart-sleeve-app/smart-sleeve-app
eas build --platform ios --profile preview
```

Notes:

- iOS installable builds require Apple Developer signing/provisioning.
- Android APK sideloading is simpler; iOS always requires Apple signing.

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
