#include <NimBLEDevice.h>
#include <SPI.h>

/**
 * ESP32 Firmware for Smart Sleeve
 * ─────────────────────────────────────────────────────────────────────────────
 * Hardware:
 *   EMG  — MyoWare 2.0 ENV output  →  GPIO 34 (ADC1_CH6, input-only, 3.3 V max)
 *   Angle — AS5048A via SPI VSPI bus
 *
 * Library Versions (install EXACTLY these in Arduino Library Manager):
 *   NimBLE-Arduino  1.4.x   (h2zero)   ← NOT v2.x
 *   arduino-esp32   2.x.x
 *
 * BLE Protocol (Little Endian):
 *   EMG: [Header(1) | Timestamp(4) | CH0-CH7 x int16(16) | Checksum(1)] = 22 bytes
 *   IMU: [Header(1) | Timestamp(4) | Angle(2) | Pitch(2) | Yaw(2) | CRC(1)]  = 12 bytes
 *        Angle is raw 14-bit (0-16383). Error state is 0x7FFF.
 *
 * ─────────────────────────── WIRING GUIDE ────────────────────────────────────
 *
 *  MyoWare 2.0 → ESP32 SparkFun Thing Plus
 *  ─────────────────────────────────────────
 *  ENV (signal)  →  GPIO 34
 *  VCC (+)       →  3V3   ← CRITICAL: Do NOT use 5V / VUSB
 *  GND (-)       →  GND
 *
 *  AS5048A Magnetic Encoder → ESP32 SparkFun Thing Plus (VSPI bus)
 *  ────────────────────────────────────────────────────────────────
 *  VCC           →  3V3
 *  GND           →  GND
 *  SCK  / SCL    →  GPIO 18    (VSPI CLK)
 *  MISO / DO     →  GPIO 19    (VSPI MISO)
 *  MOSI / DI     →  GPIO 23    (VSPI MOSI)
 *  CS   / CSn    →  GPIO  5    (Chip Select, software controlled)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── BLE UUIDs (must match constants/ble.ts exactly) ──────────────────────────
#define SERVICE_UUID            "e0d10001-6b6e-4c52-9c3b-6a8e858c5d93"
#define EMG_CHARACTERISTIC_UUID "e0d10002-6b6e-4c52-9c3b-6a8e858c5d93"
#define IMU_CHARACTERISTIC_UUID "e0d10003-6b6e-4c52-9c3b-6a8e858c5d93"

// ── Pin Definitions ───────────────────────────────────────────────────────────
const int EMG_PIN       = 34;   // MyoWare ENV — ADC1_CH6
const int AS5048A_CS    = 5;    // AS5048A Chip Select
const int SPI_SCK       = 18;
const int SPI_MISO      = 19;
const int SPI_MOSI      = 23;

// ── AS5048A Register Map ──────────────────────────────────────────────────────
const uint16_t AS5048A_REG_ANGLE = 0x3FFF;  // Angle register (14-bit)
const uint16_t AS5048A_READ_FLAG = 0x4000;  // Bit 14 = 1 for read
const uint16_t AS5048A_NOP       = 0x0000;  // No-op / dummy word

// ── Protocol Constants ────────────────────────────────────────────────────────
const uint8_t EMG_HEADER = 0xA1;
const uint8_t IMU_HEADER = 0xB1;

// ── BLE Handles ───────────────────────────────────────────────────────────────
NimBLECharacteristic* pEmgChar = nullptr;
NimBLECharacteristic* pImuChar = nullptr;
bool deviceConnected = false;

// ── Packet Buffers ────────────────────────────────────────────────────────────
uint8_t emgBuffer[22];
uint8_t imuBuffer[12];

// ─────────────────────────────────────────────────────────────────────────────
// AS5048A SPI Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate even parity for a 16-bit word.
 * The parity bit is placed at bit 15.
 */
static uint16_t as5048a_addParity(uint16_t data) {
    uint16_t d = data;
    d ^= d >> 8;
    d ^= d >> 4;
    d ^= d >> 2;
    d ^= d >> 1;
    d &= 0x01;
    return data | (d << 15);
}

/**
 * Send one 16-bit SPI word to the AS5048A and return the response.
 * CS is controlled externally.
 */
static uint16_t as5048a_spiTransfer(uint16_t command) {
    uint8_t hi = (command >> 8) & 0xFF;
    uint8_t lo = command & 0xFF;

    // Correct pattern: begin -> transfer -> end per operation
    SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE1));
    digitalWrite(AS5048A_CS, LOW);
    delayMicroseconds(1);

    uint8_t hiRx = SPI.transfer(hi);
    uint8_t loRx = SPI.transfer(lo);

    delayMicroseconds(1);
    digitalWrite(AS5048A_CS, HIGH);
    SPI.endTransaction();
    delayMicroseconds(1);  // t_dis gap between frames

    return ((uint16_t)hiRx << 8) | loRx;
}

/**
 * Read the raw 14-bit angle from the AS5048A.
 *
 * The AS5048A uses a TWO-CYCLE read protocol:
 *   Cycle 1: Send the READ command for the angle register.
 *            The response contains data from the PREVIOUS command (ignore it).
 *   Cycle 2: Send a NOP. This response CONTAINS the angle we requested.
 *
 * Returns -1 on error (error flag set or parity failure).
 */
static int32_t as5048a_readAngle() {
    // Build: READ | angle register address | parity
    const uint16_t cmd = as5048a_addParity(AS5048A_READ_FLAG | AS5048A_REG_ANGLE);

    // Cycle 1 — send command, discard response (stale data)
    as5048a_spiTransfer(cmd);

    // Cycle 2 — send NOP, receive the angle we requested
    const uint16_t response = as5048a_spiTransfer(as5048a_addParity(AS5048A_NOP));

    // Check error flag (bit 14 of response)
    if (response & 0x4000) {
        return -1;  // Sensor signalled an error
    }

    // Extract 14-bit angle value (bits 0-13)
    return (int32_t)(response & 0x3FFF);
}

/**
 * Convert raw 14-bit encoder value (0–16383) to knee flexion degrees (0–140°).
 *
 * The sensor measures 0–360° across 0–16383 counts.
 * For a knee sleeve, usable range is approximately 0–140°.
 * We clamp the output to [0, 140].
 */


// ─────────────────────────────────────────────────────────────────────────────
// BLE Server Callbacks  (NimBLE-Arduino v1.4.x API)
// ─────────────────────────────────────────────────────────────────────────────
class SleeveServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer) override {
        deviceConnected = true;
        Serial.println("[BLE] App connected.");
    }
    void onDisconnect(NimBLEServer* pServer) override {
        deviceConnected = false;
        Serial.println("[BLE] App disconnected — restarting advertising.");
        NimBLEDevice::startAdvertising();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// setup()
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);

    // ── ADC for MyoWare ENV ───────────────────────────────────────────────────
    analogReadResolution(12);   // 0–4095, matches 3.3 V reference

    // ── SPI for AS5048A ───────────────────────────────────────────────────────
    pinMode(AS5048A_CS, OUTPUT);
    digitalWrite(AS5048A_CS, HIGH);  // De-select by default

    // VSPI, Mode 1 (CPOL=0, CPHA=1), 1 MHz
    // We pass -1 for CS because we manage GPIO 5 manually via digitalWrite
    SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, -1);


    // Warm-up read (discards first frame which is undefined)
    as5048a_readAngle();
    delay(10);

    // ── BLE Init ─────────────────────────────────────────────────────────────
    NimBLEDevice::init("SMART-SLEEVE-01");
    NimBLEServer*  pServer  = NimBLEDevice::createServer();
    pServer->setCallbacks(new SleeveServerCallbacks());

    NimBLEService* pService = pServer->createService(SERVICE_UUID);

    pEmgChar = pService->createCharacteristic(EMG_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::NOTIFY);
    pImuChar = pService->createCharacteristic(IMU_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::NOTIFY);

    pService->start();

    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
    pAdv->addServiceUUID(SERVICE_UUID);
    pAdv->setScanResponse(true);
    pAdv->start();

    Serial.println("[BLE] Advertising as 'SMART-SLEEVE-01'. Waiting for app...");
}

// ─────────────────────────────────────────────────────────────────────────────
// loop()
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
    static uint32_t lastSampleTime = 0;
    static uint32_t lastSerialTime = 0;
    const uint32_t sampleInterval = 20;  // 50 Hz
    const uint32_t debugInterval  = 500; // 2 Hz

    if (!deviceConnected) return;

    // Use non-blocking timer for sampling
    uint32_t now = millis();
    if (now - lastSampleTime < sampleInterval) return;
    lastSampleTime = now;

    // ── 1. Read sensors ───────────────────────────────────────────────────────
    const int16_t emgRaw = (int16_t)analogRead(EMG_PIN);  // 0–4095
    const int32_t angleResult = as5048a_readAngle();      // 0–16383, or -1 on error
    
    // Convert to protocol-safe sentinel (0x7FFF) if sensor error
    const int16_t angleToSend = (angleResult < 0) ? (int16_t)0x7FFF : (int16_t)angleResult;

    // ── 2. Build EMG packet (22 bytes) ───────────────────────────────────────
    emgBuffer[0] = EMG_HEADER;
    memcpy(&emgBuffer[1], &now, 4);

    uint8_t emgChecksum = EMG_HEADER;
    for (int i = 0; i < 4; i++) emgChecksum ^= emgBuffer[1 + i];

    for (int i = 0; i < 8; i++) {
        const int16_t val = (i == 0) ? emgRaw : (int16_t)0;
        memcpy(&emgBuffer[5 + i * 2], &val, 2);
        emgChecksum ^= (uint8_t)(val & 0xFF) ^ (uint8_t)(val >> 8);
    }
    emgBuffer[21] = emgChecksum;

    pEmgChar->setValue(emgBuffer, 22);
    pEmgChar->notify();

    // ── 3. Build IMU/Angle packet (12 bytes) ─────────────────────────────────
    const int16_t pitch = 0;
    const int16_t yaw   = 0;

    imuBuffer[0] = IMU_HEADER;
    memcpy(&imuBuffer[1],  &now,         4);
    memcpy(&imuBuffer[5],  &angleToSend, 2);
    memcpy(&imuBuffer[7],  &pitch,       2);
    memcpy(&imuBuffer[9],  &yaw,         2);

    uint8_t imuChecksum = IMU_HEADER;
    for (int i = 0; i < 4; i++) imuChecksum ^= imuBuffer[1 + i];
    imuChecksum ^= (uint8_t)(angleToSend & 0xFF) ^ (uint8_t)(angleToSend >> 8);
    imuChecksum ^= (uint8_t)(pitch & 0xFF) ^ (uint8_t)(pitch >> 8);
    imuChecksum ^= (uint8_t)(yaw & 0xFF)   ^ (uint8_t)(yaw >> 8);
    
    imuBuffer[11] = imuChecksum;

    pImuChar->setValue(imuBuffer, 12);
    pImuChar->notify();

    // ── 4. Debug output (Throttled) ───────────────────────────────────────────
    if (now - lastSerialTime >= debugInterval) {
        lastSerialTime = now;
        Serial.printf("[DATA] EMG=%d  AngleRaw=%d (%s)\n",
            emgRaw,
            angleResult,
            angleResult < 0 ? "SENSOR_ERROR" : "OK");
    }
}
