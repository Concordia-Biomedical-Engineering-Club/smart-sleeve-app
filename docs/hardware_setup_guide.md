# Smart Sleeve Hardware Setup Guide

This guide covers how to prepare the SparkFun Thing Plus ESP32 WROOM, the MyoWare 2.0 Muscle Sensor, and the AS5600 magnetic encoder to stream real data to the Smart Sleeve App over Bluetooth Low Energy (BLE).

---

## 📦 Required Components

1. **Microcontroller:** [SparkFun Thing Plus - ESP32 WROOM (DEV-15663)](https://www.sparkfun.com/products/15663)
2. **EMG Sensor:** [MyoWare 2.0 Muscle Sensor](https://www.sparkfun.com/products/21265)
3. **Angle Sensor:** AS5600 magnetic rotary position sensor
4. **Power/Wiring:** Jumper wires and a micro-USB cable for flashing/power.

---

## ⚡ 1. Wiring the ESP32 & MyoWare

The app is expecting the MyoWare **Envelope (ENV)** signal to be sent on **GPIO 34**. The ENV output provides a smooth, rectified curve of muscle activation, replacing the need for complex on-device DSP.

| MyoWare 2.0 Pin | SparkFun ESP32 Pin | Purpose                                          |
| :-------------- | :----------------- | :----------------------------------------------- |
| **+ (VIN)**     | **3V3**            | Powers the sensor (Do **NOT** use 5V or USB pin) |
| **- (GND)**     | **GND**            | Common Ground                                    |
| **ENV**         | **34 (A2)**        | Analog Output (Signal Envelope)                  |

### AS5600 Magnetic Encoder (Angle Sensor)

The knee flexion angle is measured by the **AS5600** sensor over **I2C**. The firmware reads the **RAW ANGLE** register and sends the raw 12-bit value over BLE.

| AS5600 Pin         | SparkFun ESP32 Pin | Purpose                    |
| :----------------- | :----------------- | :------------------------- |
| **VDD3V3 / VDD5V** | **3V3**            | Power the sensor from 3.3V |
| **GND**            | **GND**            | Ground                     |
| **SDA**            | **21**             | I2C data                   |
| **SCL**            | **22**             | I2C clock                  |
| **DIR**            | **GND** or **3V3** | Fixed direction select     |
| **OUT / PWM**      | Not connected      | Not used by this firmware  |
| **PGO**            | Not connected      | Not used by this firmware  |

> [!NOTE]
> The AS5600 default I2C address is `0x36`. This firmware does not use the analog or PWM output path; it reads the digital RAW ANGLE register pair over I2C.

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

3. **No extra AS5600 library is required**
   - The firmware talks to the AS5600 directly over Arduino `Wire`, so you do not need to install a separate AS5600 helper library.

---

## 🚀 3. Flashing the Firmware

I have provided the complete, app-compatible firmware inside the repository.

1. Open the file [smart-sleeve-app/firmware/esp32_ble_sleeve.ino](../smart-sleeve-app/firmware/esp32_ble_sleeve.ino) in your Arduino IDE.
2. Connect the ESP32 to your Mac over USB.
3. Select the correct COM/Serial Port under **Tools > Port**.
4. Click **Upload**.

This firmware has already been compile-validated against the **SparkFun ESP32 Thing Plus** target with `arduino-cli`.

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
3. Open the app and go to the BLE connection screen you use for hardware bring-up.
4. Click **Scan for Devices**. You should see `SMART-SLEEVE-01` appear.
5. Tap to connect.
6. Verify that packet counters begin increasing and the knee angle changes as you move the joint.
7. Switch to the **Dashboard** to confirm the live graphs respond to real muscle activity.

### Real-hardware workflow

Use this sequence when a teammate needs to reproduce hardware bring-up without extra context:

1. Flash the ESP32 firmware and confirm the Serial Monitor shows live `[DATA]` lines.
2. Set `EXPO_PUBLIC_USE_MOCK_HARDWARE=false` in the app `.env` file.
3. Start Metro from `smart-sleeve-app/smart-sleeve-app` with:
   ```bash
   npx expo start --dev-client
   ```
   If the phone cannot reach Metro reliably, use:
   ```bash
   npx expo start --dev-client --tunnel
   ```
4. Install a native build on a physical phone:
   ```bash
   npx expo run:ios --device "<IPHONE_NAME>"
   # OR
   npx expo run:android --device "<ANDROID_MODEL>"
   ```
5. Open the BLE debug screen in the app.
6. Tap **Scan for Devices**, connect to the sleeve, and watch the transport diagnostics section first.
7. Only after transport counters are healthy should you trust dashboard-level signal visuals.

### Expected BLE contract

The app and firmware are currently aligned on this BLE contract:

- Device name prefix: `SMART-SLEEVE`
- Service UUID: `e0d10001-6b6e-4c52-9c3b-6a8e858c5d93`
- EMG characteristic UUID: `e0d10002-6b6e-4c52-9c3b-6a8e858c5d93`
- IMU/angle characteristic UUID: `e0d10003-6b6e-4c52-9c3b-6a8e858c5d93`
- EMG packet length: `22` bytes
- IMU packet length: `12` bytes
- Byte order: little-endian
- Checksum: XOR byte checksum
- Sample rate assumption in app: `50 Hz`
- Angle fault sentinel: `0x7FFF`

If the firmware changes any of those fields, the parser tests and the debug screen expectations need to be updated in the app as well.

### What the firmware is sending

- **EMG**: one live ADC channel on CH1 from the MyoWare ENV pin, channels 2-8 set to zero
- **Angle**: raw **AS5600 12-bit RAW ANGLE** value in the IMU angle field
- **Pitch/Yaw**: always zero in this firmware
- **Fault handling**: if the AS5600 read fails or no magnet is detected, the firmware sends `0x7FFF` as the angle sentinel

### Healthy connection checklist

On a healthy real connection in the BLE debug screen, you should see:

- `Requested: real`
- `Active: real`
- `Phase: connected`
- `Reconnect attempts: 0` after a steady connection is established
- `EMG packets` increasing continuously
- `IMU packets` increasing continuously
- `Last EMG age` and `Last IMU age` staying low and well under the stale timeout
- `EMG stale: no` and `IMU stale: no`
- `Characteristics` listing both BLE characteristic UUIDs above

For this firmware specifically, EMG traffic is expected on CH1 only. Channels 2-8 staying near zero is normal.

### Serial Monitor sanity check

If you open the Arduino Serial Monitor at `115200`, you should see lines like:

```text
[DATA] EMG=1832  AngleRaw=1024 (OK)
```

Possible angle statuses are:

- `OK`: angle read succeeded
- `MAGNET_WEAK`: angle read succeeded, but the magnet field is weak
- `MAGNET_STRONG`: angle read succeeded, but the magnet field is too strong
- `NO_MAGNET`: the AS5600 does not detect a usable magnet
- `I2C_ERROR`: ESP32 could not read the AS5600 over I2C

If the app connects but the knee angle stays at zero while the Serial Monitor shows `NO_MAGNET` or `I2C_ERROR`, the problem is on the hardware side, not in the BLE packet format.

### Interpreting app-side failures

Use the BLE debug screen counters and the connector logs together:

- **Checksum mismatch**:
  - Meaning: packet length and header were valid enough to parse, but the XOR checksum failed.
  - What you will see: checksum counters increase, data may still appear, connector logs `EMG checksum mismatch` or `IMU checksum mismatch`.
  - Likely cause: corrupted bytes on the wire or firmware checksum bug.

- **Parser mismatch / invalid packet**:
  - Meaning: the packet could not be parsed at all.
  - What you will see: dropped-packet counters increase, connector logs `Dropping invalid EMG packet` or `Dropping invalid IMU packet`.
  - Likely cause: wrong packet length, wrong header, or firmware payload shape drift.

- **Transport failure**:
  - Meaning: BLE notifications or connection state failed before packet parsing could succeed.
  - What you will see: notify-error counters increase, phase changes to `reconnecting` or `failed`, connector logs notification errors or disconnect messages.
  - Likely cause: BLE instability, power issues, device reset, or native Bluetooth stack problems.

- **Discovery contract failure**:
  - Meaning: the app connected to a BLE device, but it did not expose the expected sleeve service or both required characteristics.
  - What you will see: phase changes to `failed` with `missing-service` or `missing-characteristics`.
  - Likely cause: wrong firmware, wrong board, or a device advertising the sleeve name without the expected GATT layout.
