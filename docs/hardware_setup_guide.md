# Smart Sleeve Hardware Setup Guide

This guide covers how to prepare the SparkFun Thing Plus ESP32 WROOM and the MyoWare 2.0 Muscle Sensor to stream real clinical data to the Smart Sleeve App over Bluetooth Low Energy (BLE).

---

## 📦 Required Components
1. **Microcontroller:** [SparkFun Thing Plus - ESP32 WROOM (DEV-15663)](https://www.sparkfun.com/products/15663)
2. **EMG Sensor:** [MyoWare 2.0 Muscle Sensor](https://www.sparkfun.com/products/21265)
3. **Power/Wiring:** Jumper wires and a micro-USB cable for flashing/power.

---

## ⚡ 1. Wiring the ESP32 & MyoWare

The app is expecting the MyoWare **Envelope (ENV)** signal to be sent on **GPIO 34**. The ENV output provides a smooth, rectified curve of muscle activation, replacing the need for complex on-device DSP.

| MyoWare 2.0 Pin | SparkFun ESP32 Pin | Purpose |
| :--- | :--- | :--- |
| **+ (VIN)** | **3V3** | Powers the sensor (Do **NOT** use 5V or USB pin) |
| **- (GND)** | **GND** | Common Ground |
| **ENV** | **34 (A2)** | Analog Output (Signal Envelope) |

> [!WARNING]
> **Voltage Limits**: The ESP32's Analog-to-Digital Converter (ADC) can only handle a maximum of **3.3V**. Ensure the MyoWare is powered from the **3V3** pin, NOT the 5V/VUSB pin, to prevent destroying the GPIO pins.

---

## 💻 2. Preparing the Arduino IDE

We will be flashing the ESP32 using the Arduino IDE. You need the correct board manager and BLE library.

1. **Install the ESP32 Board**
   * Go to **Arduino > Settings** and add this to "Additional Boards Manager URLs": `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   * Go to **Tools > Board > Boards Manager**, search for `esp32`, and install it.
   * Under **Tools > Board**, select **SparkFun ESP32 Thing Plus**.

2. **Install to NimBLE Library**
   * The standard ESP32 BLE library uses too much memory. We strictly use **NimBLE**.
   * Go to **Sketch > Include Library > Manage Libraries**.
   * Search for **"NimBLE-Arduino"** (by h2zero) and install the latest version.

---

## 🚀 3. Flashing the Firmware

I have provided the complete, app-compatible firmware inside the repository.

1. Open the file [firmware/esp32_ble_sleeve.ino](file:///Volumes/PSSDT7/BEC/app/smart-sleeve-app/smart-sleeve-app/firmware/esp32_ble_sleeve.ino) in your Arduino IDE.
2. Connect the ESP32 to your Mac over USB.
3. Select the correct COM/Serial Port under **Tools > Port**.
4. Click **Upload**.

> [!TIP]
> If the upload fails to connect, you may need to hold down the **"BOOT"** button on the SparkFun board when you see the `Connecting...` text in the Arduino console.

---

## 📱 4. Connecting to the App

Now that the hardware is broadcasting, let's connect it to your phone.

1. Open your project `.env` file and **turn off Mock mode**:
   ```env
   EXPO_PUBLIC_USE_MOCK_HARDWARE=false
   ```
2. Because BLE requires native Bluetooth bindings, you **cannot test this inside Expo Go**. You must run a development build to your physical iPhone/Android:
   ```bash
   npx expo run:ios --device
   # OR
   npx expo run:android
   ```
3. Open the **Test Connection** tab in the app.
4. Click **Scan for Devices**. You should see `SMART-SLEEVE-01` appear.
5. Tap to connect.
6. Switch to the **Dashboard** — the live graphs will now be plotting the electrical activity from your actual arm! Try flexing!
