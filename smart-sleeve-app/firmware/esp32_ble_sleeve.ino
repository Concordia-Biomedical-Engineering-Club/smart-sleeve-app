#include <NimBLEDevice.h>
#include <Wire.h>

/**
 * ESP32 Firmware for Smart Sleeve
 * ─────────────────────────────────────────────────────────────────────────────
 * Hardware:
 *   EMG  — MyoWare 2.0 ENV output  →  GPIO 34 (ADC1_CH6, input-only, 3.3 V max)
 *   Angle — AS5600 via I2C
 *
 * Library Versions (install EXACTLY these in Arduino Library Manager):
 *   NimBLE-Arduino  1.4.x   (h2zero)   ← NOT v2.x
 *   arduino-esp32   2.x.x
 *
 * BLE Protocol (Little Endian):
 *   EMG: [Header(1) | Timestamp(4) | CH0-CH7 x int16(16) | Checksum(1)] = 22 bytes
 *   IMU: [Header(1) | Timestamp(4) | Angle(2) | Pitch(2) | Yaw(2) | CRC(1)]  = 12 bytes
 *        Angle is raw 12-bit AS5600 RAW ANGLE (0-4095). Error state is 0x7FFF.
 *
 * ─────────────────────────── WIRING GUIDE ────────────────────────────────────
 *
 *  MyoWare 2.0 → ESP32 SparkFun Thing Plus
 *  ─────────────────────────────────────────
 *  ENV (signal)  →  GPIO 34
 *  VCC (+)       →  3V3   ← CRITICAL: Do NOT use 5V / VUSB
 *  GND (-)       →  GND
 *
 *  AS5600 Magnetic Encoder → ESP32 SparkFun Thing Plus (I2C)
 *  ──────────────────────────────────────────────────────────────
 *  VDD3V3 / VDD5V →  3V3
 *  GND            →  GND
 *  SDA            →  GPIO 21
 *  SCL            →  GPIO 22
 *  DIR            →  GND or 3V3 (fixed direction select)
 *  OUT / PWM      →  Not used in this firmware
 *
 *  Notes:
 *  - AS5600 default I2C slave address is 0x36.
 *  - This firmware uses the RAW ANGLE register so the BLE payload stays
 *    unscaled and matches the app-side 12-bit parser.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── BLE UUIDs (must match constants/ble.ts exactly) ──────────────────────────
#define SERVICE_UUID "e0d10001-6b6e-4c52-9c3b-6a8e858c5d93"
#define EMG_CHARACTERISTIC_UUID "e0d10002-6b6e-4c52-9c3b-6a8e858c5d93"
#define IMU_CHARACTERISTIC_UUID "e0d10003-6b6e-4c52-9c3b-6a8e858c5d93"

// ── Pin Definitions ───────────────────────────────────────────────────────────
const int EMG_PIN = 34; // MyoWare ENV — ADC1_CH6
const int I2C_SDA = 21;
const int I2C_SCL = 22;

// ── AS5600 Register Map ───────────────────────────────────────────────────────
const uint8_t AS5600_I2C_ADDRESS = 0x36;
const uint8_t AS5600_REG_STATUS = 0x0B;
const uint8_t AS5600_REG_RAW_ANGLE_HI = 0x0C;
const uint8_t AS5600_STATUS_MH = 0x08;
const uint8_t AS5600_STATUS_ML = 0x10;
const uint8_t AS5600_STATUS_MD = 0x20;
const uint16_t AS5600_ANGLE_MASK = 0x0FFF;
const int16_t ANGLE_FAULT_SENTINEL = 0x7FFF;

// ── Protocol Constants ────────────────────────────────────────────────────────
const uint8_t EMG_HEADER = 0xA1;
const uint8_t IMU_HEADER = 0xB1;

// ── BLE Handles ───────────────────────────────────────────────────────────────
NimBLECharacteristic *pEmgChar = nullptr;
NimBLECharacteristic *pImuChar = nullptr;
bool deviceConnected = false;

// ── Packet Buffers ────────────────────────────────────────────────────────────
uint8_t emgBuffer[22];
uint8_t imuBuffer[12];

// ─────────────────────────────────────────────────────────────────────────────
// AS5600 I2C Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

enum AS5600ReadStatus
{
    AS5600_OK,
    AS5600_I2C_ERROR,
    AS5600_NO_MAGNET,
    AS5600_MAGNET_WEAK,
    AS5600_MAGNET_STRONG,
};

static bool as5600_readRegister(uint8_t reg, uint8_t *value)
{
    Wire.beginTransmission(AS5600_I2C_ADDRESS);
    Wire.write(reg);

    if (Wire.endTransmission(false) != 0)
    {
        return false;
    }

    if (Wire.requestFrom(AS5600_I2C_ADDRESS, (uint8_t)1) != 1)
    {
        return false;
    }

    *value = Wire.read();
    return true;
}

/**
 * Read the RAW ANGLE register pair (0x0C / 0x0D).
 * The AS5600 exposes 12 valid bits across the two bytes.
 */
static bool as5600_readRawAngleRegister(uint16_t *rawAngle)
{
    Wire.beginTransmission(AS5600_I2C_ADDRESS);
    Wire.write(AS5600_REG_RAW_ANGLE_HI);

    if (Wire.endTransmission(false) != 0)
    {
        return false;
    }

    if (Wire.requestFrom(AS5600_I2C_ADDRESS, (uint8_t)2) != 2)
    {
        return false;
    }

    const uint8_t hi = Wire.read();
    const uint8_t lo = Wire.read();

    *rawAngle = (((uint16_t)hi << 8) | lo) & AS5600_ANGLE_MASK;
    return true;
}

/**
 * Read the current AS5600 raw angle.
 *
 * Returns a 12-bit value in the range [0, 4095] when the sensor is readable.
 * Returns -1 when the sensor cannot provide a usable value.
 *
 * Magnet field diagnostics:
 * - No magnet detected: unusable, returns -1.
 * - Magnet too weak / too strong: returns the current raw angle but flags status.
 */
static int32_t as5600_readRawAngle(AS5600ReadStatus *statusOut)
{
    uint8_t statusReg = 0;
    if (!as5600_readRegister(AS5600_REG_STATUS, &statusReg))
    {
        *statusOut = AS5600_I2C_ERROR;
        return -1;
    }

    if ((statusReg & AS5600_STATUS_MD) == 0)
    {
        *statusOut = AS5600_NO_MAGNET;
        return -1;
    }

    uint16_t rawAngle = 0;
    if (!as5600_readRawAngleRegister(&rawAngle))
    {
        *statusOut = AS5600_I2C_ERROR;
        return -1;
    }

    if (statusReg & AS5600_STATUS_MH)
    {
        *statusOut = AS5600_MAGNET_STRONG;
    }
    else if (statusReg & AS5600_STATUS_ML)
    {
        *statusOut = AS5600_MAGNET_WEAK;
    }
    else
    {
        *statusOut = AS5600_OK;
    }

    return (int32_t)rawAngle;
}

static const char *as5600StatusToString(AS5600ReadStatus status)
{
    switch (status)
    {
    case AS5600_OK:
        return "OK";
    case AS5600_I2C_ERROR:
        return "I2C_ERROR";
    case AS5600_NO_MAGNET:
        return "NO_MAGNET";
    case AS5600_MAGNET_WEAK:
        return "MAGNET_WEAK";
    case AS5600_MAGNET_STRONG:
        return "MAGNET_STRONG";
    default:
        return "UNKNOWN";
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BLE Server Callbacks  (NimBLE-Arduino v1.4.x API)
// ─────────────────────────────────────────────────────────────────────────────
class SleeveServerCallbacks : public NimBLEServerCallbacks
{
    void onConnect(NimBLEServer *pServer) override
    {
        deviceConnected = true;
        Serial.println("[BLE] App connected.");
    }
    void onDisconnect(NimBLEServer *pServer) override
    {
        deviceConnected = false;
        Serial.println("[BLE] App disconnected — restarting advertising.");
        NimBLEDevice::startAdvertising();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// setup()
// ─────────────────────────────────────────────────────────────────────────────
void setup()
{
    Serial.begin(115200);

    // ── ADC for MyoWare ENV ───────────────────────────────────────────────────
    analogReadResolution(12); // 0–4095, matches 3.3 V reference

    // ── I2C for AS5600 ────────────────────────────────────────────────────────
    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(400000); // Stable fast-mode I2C on ESP32
    delay(10);             // Allow AS5600 power-up settling

    // Warm-up read so the first loop iteration doesn't pay the initialization cost.
    AS5600ReadStatus warmupStatus = AS5600_OK;
    as5600_readRawAngle(&warmupStatus);

    // ── BLE Init ─────────────────────────────────────────────────────────────
    NimBLEDevice::init("SMART-SLEEVE-01");
    NimBLEServer *pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new SleeveServerCallbacks());

    NimBLEService *pService = pServer->createService(SERVICE_UUID);

    pEmgChar = pService->createCharacteristic(EMG_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::NOTIFY);
    pImuChar = pService->createCharacteristic(IMU_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::NOTIFY);

    pService->start();

    NimBLEAdvertising *pAdv = NimBLEDevice::getAdvertising();
    pAdv->addServiceUUID(SERVICE_UUID);
    pAdv->setScanResponse(true);
    pAdv->start();

    Serial.println("[BLE] Advertising as 'SMART-SLEEVE-01'. Waiting for app...");
}

// ─────────────────────────────────────────────────────────────────────────────
// loop()
// ─────────────────────────────────────────────────────────────────────────────
void loop()
{
    static uint32_t lastSampleTime = 0;
    static uint32_t lastSerialTime = 0;
    const uint32_t sampleInterval = 20; // 50 Hz
    const uint32_t debugInterval = 500; // 2 Hz

    if (!deviceConnected)
        return;

    // Use non-blocking timer for sampling
    uint32_t now = millis();
    if (now - lastSampleTime < sampleInterval)
        return;
    lastSampleTime = now;

    // ── 1. Read sensors ───────────────────────────────────────────────────────
    const int16_t emgRaw = (int16_t)analogRead(EMG_PIN); // 0–4095
    AS5600ReadStatus angleStatus = AS5600_OK;
    const int32_t angleResult = as5600_readRawAngle(&angleStatus); // 0–4095, or -1 on error

    // Convert to protocol-safe sentinel (0x7FFF) if sensor error
    const int16_t angleToSend =
        (angleResult < 0) ? ANGLE_FAULT_SENTINEL : (int16_t)angleResult;

    // ── 2. Build EMG packet (22 bytes) ───────────────────────────────────────
    emgBuffer[0] = EMG_HEADER;
    memcpy(&emgBuffer[1], &now, 4);

    uint8_t emgChecksum = EMG_HEADER;
    for (int i = 0; i < 4; i++)
        emgChecksum ^= emgBuffer[1 + i];

    for (int i = 0; i < 8; i++)
    {
        const int16_t val = (i == 0) ? emgRaw : (int16_t)0;
        memcpy(&emgBuffer[5 + i * 2], &val, 2);
        emgChecksum ^= (uint8_t)(val & 0xFF) ^ (uint8_t)(val >> 8);
    }
    emgBuffer[21] = emgChecksum;

    pEmgChar->setValue(emgBuffer, 22);
    pEmgChar->notify();

    // ── 3. Build IMU/Angle packet (12 bytes) ─────────────────────────────────
    const int16_t pitch = 0;
    const int16_t yaw = 0;

    imuBuffer[0] = IMU_HEADER;
    memcpy(&imuBuffer[1], &now, 4);
    memcpy(&imuBuffer[5], &angleToSend, 2);
    memcpy(&imuBuffer[7], &pitch, 2);
    memcpy(&imuBuffer[9], &yaw, 2);

    uint8_t imuChecksum = IMU_HEADER;
    for (int i = 0; i < 4; i++)
        imuChecksum ^= imuBuffer[1 + i];
    imuChecksum ^= (uint8_t)(angleToSend & 0xFF) ^ (uint8_t)(angleToSend >> 8);
    imuChecksum ^= (uint8_t)(pitch & 0xFF) ^ (uint8_t)(pitch >> 8);
    imuChecksum ^= (uint8_t)(yaw & 0xFF) ^ (uint8_t)(yaw >> 8);

    imuBuffer[11] = imuChecksum;

    pImuChar->setValue(imuBuffer, 12);
    pImuChar->notify();

    // ── 4. Debug output (Throttled) ───────────────────────────────────────────
    if (now - lastSerialTime >= debugInterval)
    {
        lastSerialTime = now;
        Serial.printf("[DATA] EMG=%d  AngleRaw=%d (%s)\n",
                      emgRaw,
                      angleResult,
                      as5600StatusToString(angleStatus));
    }
}
