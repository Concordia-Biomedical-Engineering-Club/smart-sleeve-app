/**
 * Smart Sleeve — ESP32 BLE Firmware  v2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Streams EMG + knee-angle data to the Smart Sleeve iOS/Android app over BLE.
 *
 * ── Target ───────────────────────────────────────────────────────────────────
 *   Board:   SparkFun ESP32 Thing Plus
 *   Core:    ESP32 Arduino Core  2.0.17   (Boards Manager)
 *   Libs:    NimBLE-Arduino      1.4.x    (Library Manager — h2zero)
 *            AS5600              latest    (Library Manager — Rob Tillaart)
 *            MyoWare             latest    (Library Manager — Advancer Technologies)
 *
 * ── Known Issue This Fixes ───────────────────────────────────────────────────
 *   The v1 firmware called pEmgChar->notify() and pImuChar->notify() back-to-
 *   back in the same loop tick.  On iOS (CoreBluetooth) the NimBLE TX queue
 *   can only hold a few outstanding notifications before the second notify()
 *   returns BLE_HS_ENOMEM — which react-native-ble-plx surfaces as a
 *   "notification error" and the packet is lost.
 *
 *   Fix: stagger the two notifications.  EMG fires on even ticks, IMU fires
 *   on odd ticks, each at 50 Hz (every 20 ms).  This means each characteristic
 *   still sends 50 packets/sec but they never collide in the same TX window.
 *
 * ── BLE Protocol  (must match constants/ble.ts) ─────────────────────────────
 *
 *   Service:  e0d10001-6b6e-4c52-9c3b-6a8e858c5d93
 *   EMG Char: e0d10002-...  (Notify)   22 bytes
 *   IMU Char: e0d10003-...  (Notify)   12 bytes
 *
 *   EMG layout  [little-endian]:
 *     [0]       0xA1 header
 *     [1-4]     uint32  timestamp (millis)
 *     [5-20]    8× int16  channels  (raw ADC 0-4095)
 *     [21]      uint8   XOR checksum of bytes [0..20]
 *
 *   IMU layout  [little-endian]:
 *     [0]       0xB1 header
 *     [1-4]     uint32  timestamp (millis)
 *     [5-6]     int16   angle  (AS5600 raw 0-4095, or 0x7FFF = fault)
 *     [7-8]     int16   pitch  (reserved, 0)
 *     [9-10]    int16   yaw    (reserved, 0)
 *     [11]      uint8   XOR checksum of bytes [0..10]
 *
 * ── Wiring ───────────────────────────────────────────────────────────────────
 *   MyoWare 2.0 Sensor 1:  ENV → GPIO 36 (A0)   VCC → 3V3   GND → GND
 *   MyoWare 2.0 Sensor 2:  ENV → GPIO 39 (A1)   VCC → 3V3   GND → GND
 *   AS5600:  SDA → GPIO 21   SCL → GPIO 22   VDD → 3V3   GND → GND
 *            DIR → GND  (clockwise)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

#include <NimBLEDevice.h>
#include <Wire.h>
#include <MyoWare.h>
#include <AS5600.h>

// ─── BLE UUIDs  (constants/ble.ts) ───────────────────────────────────────────
#define SERVICE_UUID "e0d10001-6b6e-4c52-9c3b-6a8e858c5d93"
#define EMG_CHARACTERISTIC_UUID "e0d10002-6b6e-4c52-9c3b-6a8e858c5d93"
#define IMU_CHARACTERISTIC_UUID "e0d10003-6b6e-4c52-9c3b-6a8e858c5d93"

#define BLE_DEVICE_NAME "SMART-SLEEVE-01"

// ─── Pins ────────────────────────────────────────────────────────────────────
static const int EMG1_PIN = A0; // GPIO 36 — MyoWare sensor 1 ENV
static const int EMG2_PIN = A1; // GPIO 39 — MyoWare sensor 2 ENV

// ─── Protocol constants ──────────────────────────────────────────────────────
static const uint8_t EMG_HEADER = 0xA1;
static const uint8_t IMU_HEADER = 0xB1;
static const int16_t ANGLE_FAULT = 0x7FFF;

// ─── Timing ──────────────────────────────────────────────────────────────────
// 10 ms tick → EMG on even ticks (0, 20, 40 …), IMU on odd ticks (10, 30, 50 …)
// Each characteristic gets 50 Hz but they never notify in the same tick.
static const uint32_t TICK_MS = 10;
static const uint32_t DEBUG_INTERVAL = 2000;

// ─── Sensor objects ──────────────────────────────────────────────────────────
MyoWare emgSensor1;
MyoWare emgSensor2;
AS5600 angleSensor;

// ─── BLE state ───────────────────────────────────────────────────────────────
static NimBLEServer *pServer = nullptr;
static NimBLECharacteristic *pEmgChar = nullptr;
static NimBLECharacteristic *pImuChar = nullptr;
static volatile bool deviceConnected = false;

// ─── Packet buffers ──────────────────────────────────────────────────────────
static uint8_t emgBuf[22];
static uint8_t imuBuf[12];

// ─── Tick counter ────────────────────────────────────────────────────────────
static uint32_t tickCount = 0;

// ══════════════════════════════════════════════════════════════════════════════
//  Checksum  — XOR of bytes [0..len-1], matches packetParsers.ts
// ══════════════════════════════════════════════════════════════════════════════

static uint8_t xorChecksum(const uint8_t *buf, uint8_t len)
{
    uint8_t cs = buf[0];
    for (uint8_t i = 1; i < len; i++)
        cs ^= buf[i];
    return cs;
}

// ══════════════════════════════════════════════════════════════════════════════
//  BLE Callbacks  (NimBLE-Arduino 1.4.x API)
// ══════════════════════════════════════════════════════════════════════════════

class ServerCB : public NimBLEServerCallbacks
{
    void onConnect(NimBLEServer *s, ble_gap_conn_desc *desc) override
    {
        deviceConnected = true;
        Serial.println(F("[BLE] Client connected"));

        // Request faster connection parameters for iOS.
        // Without this, iOS defaults to ~30-50 ms intervals which is fine,
        // but explicitly requesting 15-30 ms improves notification throughput.
        s->updateConnParams(desc->conn_handle,
                            12, // min interval  = 12 × 1.25 ms = 15 ms
                            24, // max interval  = 24 × 1.25 ms = 30 ms
                            0,  // latency
                            400 // supervision timeout = 4 s
        );
    }

    void onDisconnect(NimBLEServer *s) override
    {
        deviceConnected = false;
        Serial.println(F("[BLE] Disconnected — restarting advertising"));
        NimBLEDevice::startAdvertising();
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  Packet builders
// ══════════════════════════════════════════════════════════════════════════════

static void buildAndSendEMG(uint32_t ts)
{
    // Read both MyoWare sensors via library
    int emg1 = emgSensor1.readSensorOutput(); // 0-4095
    int emg2 = emgSensor2.readSensorOutput(); // 0-4095

    emgBuf[0] = EMG_HEADER;
    memcpy(&emgBuf[1], &ts, 4);

    // CH0 = sensor 1, CH1 = sensor 2, CH2-CH7 = 0
    int16_t channels[8] = {
        (int16_t)emg1,
        (int16_t)emg2,
        0, 0, 0, 0, 0, 0};

    for (int ch = 0; ch < 8; ch++)
    {
        memcpy(&emgBuf[5 + ch * 2], &channels[ch], 2);
    }

    emgBuf[21] = xorChecksum(emgBuf, 21);

    pEmgChar->setValue(emgBuf, 22);
    pEmgChar->notify();
}

static void buildAndSendIMU(uint32_t ts)
{
    // Read AS5600 via library — returns 0-4095 raw, magnet must be present
    int16_t angleToSend;

    if (angleSensor.detectMagnet())
    {
        uint16_t raw = angleSensor.rawAngle(); // 0-4095  (12-bit)
        angleToSend = (int16_t)raw;
    }
    else
    {
        angleToSend = ANGLE_FAULT; // 0x7FFF → app maps to 0°
    }

    int16_t pitch = 0;
    int16_t yaw = 0;

    imuBuf[0] = IMU_HEADER;
    memcpy(&imuBuf[1], &ts, 4);
    memcpy(&imuBuf[5], &angleToSend, 2);
    memcpy(&imuBuf[7], &pitch, 2);
    memcpy(&imuBuf[9], &yaw, 2);

    imuBuf[11] = xorChecksum(imuBuf, 11);

    pImuChar->setValue(imuBuf, 12);
    pImuChar->notify();
}

// ══════════════════════════════════════════════════════════════════════════════
//  setup()
// ══════════════════════════════════════════════════════════════════════════════

void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println(F("\n========================================"));
    Serial.println(F(" Smart Sleeve Firmware v2"));
    Serial.println(F("========================================"));

    // ── ADC ──────────────────────────────────────────────────────────────────
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // ── MyoWare sensors ──────────────────────────────────────────────────────
    emgSensor1.setENVPin(EMG1_PIN);
    emgSensor2.setENVPin(EMG2_PIN);

    // Warm-up reads (ESP32 ADC first-read jitter)
    for (int i = 0; i < 5; i++)
    {
        emgSensor1.readSensorOutput();
        emgSensor2.readSensorOutput();
    }
    Serial.println(F("[EMG] MyoWare sensors initialized on A0, A1"));

    // ── AS5600 ───────────────────────────────────────────────────────────────
    Wire.begin(); // SDA=21, SCL=22 (ESP32 defaults)
    Wire.setClock(400000);
    delay(50);

    angleSensor.begin(); // uses default Wire, address 0x36
    angleSensor.setDirection(AS5600_CLOCK_WISE);

    bool magnetPresent = angleSensor.detectMagnet();
    Serial.printf("[AS5600] Magnet: %s", magnetPresent ? "DETECTED" : "NOT FOUND");
    if (magnetPresent)
    {
        Serial.printf("  rawAngle=%d\n", angleSensor.rawAngle());
    }
    else
    {
        Serial.println(F("  — will send fault sentinel (0x7FFF)"));
    }

    // ── BLE ──────────────────────────────────────────────────────────────────
    Serial.println(F("[BLE] Initializing NimBLE..."));
    NimBLEDevice::init(BLE_DEVICE_NAME);
    NimBLEDevice::setPower(ESP_PWR_LVL_P6);
    NimBLEDevice::setMTU(72);

    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCB());

    NimBLEService *pService = pServer->createService(SERVICE_UUID);

    pEmgChar = pService->createCharacteristic(
        EMG_CHARACTERISTIC_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

    pImuChar = pService->createCharacteristic(
        IMU_CHARACTERISTIC_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

    pService->start();

    // ── Advertising ──────────────────────────────────────────────────────────
    NimBLEAdvertising *pAdv = NimBLEDevice::getAdvertising();
    pAdv->addServiceUUID(SERVICE_UUID);
    pAdv->setScanResponse(true);
    pAdv->setMinInterval(0x20); // 20 ms  (Apple BLE guidelines)
    pAdv->setMaxInterval(0x40); // 40 ms
    pAdv->start();

    Serial.println(F("[BLE] Advertising as '" BLE_DEVICE_NAME "'"));
    Serial.println(F("[BLE] Waiting for app...\n"));
}

// ══════════════════════════════════════════════════════════════════════════════
//  loop()  — 10 ms tick, alternating EMG / IMU to avoid TX queue collision
// ══════════════════════════════════════════════════════════════════════════════

void loop()
{
    if (!deviceConnected)
    {
        delay(100);
        return;
    }

    static uint32_t lastTick = 0;
    static uint32_t lastDebug = 0;

    uint32_t now = millis();
    if (now - lastTick < TICK_MS)
        return;
    lastTick = now;

    // ── Alternate: even tick → EMG,  odd tick → IMU ──────────────────────────
    if (tickCount % 2 == 0)
    {
        buildAndSendEMG(now);
    }
    else
    {
        buildAndSendIMU(now);
    }
    tickCount++;

    // ── Serial debug (throttled) ─────────────────────────────────────────────
    if (now - lastDebug >= DEBUG_INTERVAL)
    {
        lastDebug = now;
        int e1 = emgSensor1.readSensorOutput();
        int e2 = emgSensor2.readSensorOutput();
        bool mag = angleSensor.detectMagnet();
        Serial.printf("[%lu] EMG1=%d EMG2=%d Angle=%s\n",
                      now, e1, e2,
                      mag ? String(angleSensor.rawAngle()).c_str() : "FAULT");
    }
}
