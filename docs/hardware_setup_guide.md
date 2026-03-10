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

| MyoWare 2.0 Pin | SparkFun ESP32 Pin | Purpose                                          |
| :-------------- | :----------------- | :----------------------------------------------- |
| **+ (VIN)**     | **3V3**            | Powers the sensor (Do **NOT** use 5V or USB pin) |
| **- (GND)**     | **GND**            | Common Ground                                    |
| **ENV**         | **34 (A2)**        | Analog Output (Signal Envelope)                  |

### AS5048A Magnetic Encoder (Angle Sensor)

The knee flexion angle is measured by the **AS5048A** sensor via the SPI bus.

| AS5048A Pin   | SparkFun ESP32 Pin | SPI Function         |
| :------------ | :----------------- | :------------------- |
| **VCC**       | **3V3**            | Power (3.3V)         |
| **GND**       | **GND**            | Ground               |
| **SCL** / SCK | **18**             | VSPI Clock           |
| **DO** / MISO | **19**             | VSPI MISO            |
| **DI** / MOSI | **23**             | VSPI MOSI            |
| **CSn** / CS  | **5**              | Software Chip Select |

> [!WARNING]
> **Voltage Limits**: The ESP32's Analog-to-Digital Converter (ADC) can only handle a maximum of **3.3V**. Ensure all sensors are powered from the **3V3** pin, NOT the 5V/VUSB pin, to prevent damaging the GPIO pins.

---

## 💻 2. Preparing the Arduino IDE

We will be flashing the ESP32 using the Arduino IDE. You need the correct board manager and BLE library.

1. **Install the ESP32 Board**
   - Go to **Arduino > Settings** and add this to "Additional Boards Manager URLs": `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Go to **Tools > Board > Boards Manager**, search for `esp32`, and install it.
   - Under **Tools > Board**, select **SparkFun ESP32 Thing Plus**.

2. **Install the NimBLE Library**
   - The standard ESP32 BLE library uses too much memory. We strictly use **NimBLE**.
   - Go to **Sketch > Include Library > Manage Libraries**.
   - Search for **"NimBLE-Arduino"** (by h2zero) and install **version 1.4.x** — do not install v2.x, as the API is incompatible with this firmware.

---

## 🚀 3. Flashing the Firmware

I have provided the complete, app-compatible firmware inside the repository.

1. Open the file [smart-sleeve-app/firmware/esp32_ble_sleeve.ino](../smart-sleeve-app/firmware/esp32_ble_sleeve.ino) in your Arduino IDE.
2. Connect the ESP32 to your Mac over USB.
3. Select the correct COM/Serial Port under **Tools > Port**.
4. Click **Upload**.

> [!TIP]
> If the upload fails to connect, you may need to hold down the **"BOOT"** button on the SparkFun board when you see the `Connecting...` text in the Arduino console.

### Upload Troubleshooting

If Arduino says this:

```text
Failed to connect to ESP32: Wrong boot mode detected (0x13)! The chip needs to be in download mode.
```

the sketch already compiled, but the ESP32 did **not** enter flashing mode.

Try this exact sequence:

1. Click **Upload** in Arduino IDE.
2. As soon as the console shows `Connecting...`, press and hold the **BOOT** button on the ESP32.
3. Keep holding **BOOT** until the upload actually starts.
4. If needed, tap **RST / EN** once while still holding **BOOT**, then release **BOOT** after the connection begins.

If it still fails:

1. Make sure **Tools > Board** is set to **SparkFun ESP32 Thing Plus**.
2. Make sure the selected serial port is the actual ESP32 device.
3. Close any open **Serial Monitor** window before uploading.
4. Try a different USB cable, because many cables provide power only and do not carry data reliably.
5. In **Tools**, reduce the upload speed if your setup is unstable.

> [!NOTE]
> The `BT: forcing BR/EDR max sync conn eff to 1...` line is only a compile-time message from the ESP32 Bluetooth stack. It is not the error causing the upload failure.

### 📱 Android Build Troubleshooting (Windows)

If you get an error saying **"SDK location not found"** when running `npx expo run:android`:

1. Find your Android SDK path (usually `C:\Users\<YourUser>\AppData\Local\Android\Sdk`).
2. Create a file named `local.properties` inside the `smart-sleeve-app/android/` folder.
3. Add this line to the file, using double backslashes:
   ```properties
   sdk.dir=C:\\Users\\<YourUser>\\AppData\\Local\\Android\\Sdk
   ```
4. Restart your terminal and run the command again.

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
