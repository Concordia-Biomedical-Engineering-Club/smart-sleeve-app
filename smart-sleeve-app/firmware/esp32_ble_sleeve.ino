#include <NimBLEDevice.h>
#include <Wire.h>

/**
 * ESP32 Firmware for Smart Sleeve — FIXED & OPTIMIZED
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from original:
 *   1. I2C bus recovery on startup (toggles SCL to unstick slave)
 *   2. Wire.endTransmission(true) before requestFrom (fixes ESP32 I2C bug)
 *   3. Retry logic (3 attempts) on every I2C read
 *   4. Bus re-init on repeated failures
 *   5. Burst-read status + angle in one transaction (faster, fewer errors)
 *   6. Increased I2C clock to 400 kHz after stable init
 *
 * Hardware:
 *   EMG   — MyoWare 2.0 ENV output → GPIO 34
 *   Angle — AS5600 via I2C (SDA 21, SCL 22)
 *
 * BLE Protocol (matches constants/ble.ts & packetParsers.ts):
 *   EMG: [0xA1 | uint32 ts | 8×int16 ch | xor checksum] = 22 bytes
 *   IMU: [0xB1 | uint32 ts | int16 angle | int16 pitch | int16 yaw | xor] = 12 bytes
 *        Angle = raw 12-bit AS5600 (0–4095). Fault = 0x7FFF.
 *
 * ─────────────── WIRING ─────────────────────────────────────────────────────
 *  MyoWare 2.0 → ESP32
 *    ENV → GPIO 34 | VCC → 3V3 | GND → GND
 *
 *  AS5600 → ESP32
 *    VDD → 3V3 | GND → GND | SDA → GPIO 21 | SCL → GPIO 22 | DIR → GND
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── BLE UUIDs (must match constants/ble.ts) ──────────────────────────────────
#define SERVICE_UUID            "e0d10001-6b6e-4c52-9c3b-6a8e858c5d93"
#define EMG_CHARACTERISTIC_UUID "e0d10002-6b6e-4c52-9c3b-6a8e858c5d93"
#define IMU_CHARACTERISTIC_UUID "e0d10003-6b6e-4c52-9c3b-6a8e858c5d93"

// ── Pins ──────────────────────────────────────────────────────────────────────
const int EMG_PIN = 34;
const int I2C_SDA = 21;
const int I2C_SCL = 22;

// ── AS5600 ────────────────────────────────────────────────────────────────────
const uint8_t  AS5600_ADDR          = 0x36;
const uint8_t  AS5600_REG_STATUS    = 0x0B;
const uint8_t  AS5600_REG_RAW_HI    = 0x0C;
const uint8_t  AS5600_STATUS_MD     = 0x20;
const uint8_t  AS5600_STATUS_ML     = 0x10;
const uint8_t  AS5600_STATUS_MH     = 0x08;
const uint16_t AS5600_ANGLE_MASK    = 0x0FFF;
const int16_t  ANGLE_FAULT_SENTINEL = 0x7FFF;

// ── I2C Reliability ───────────────────────────────────────────────────────────
const uint8_t  I2C_MAX_RETRIES      = 3;
const uint32_t I2C_RETRY_DELAY_US   = 200;
const uint32_t I2C_REINIT_INTERVAL  = 5000;
uint32_t       lastI2CReinit        = 0;
uint32_t       consecutiveI2CFails  = 0;

// ── Protocol ──────────────────────────────────────────────────────────────────
const uint8_t EMG_HEADER = 0xA1;
const uint8_t IMU_HEADER = 0xB1;

// ── BLE ───────────────────────────────────────────────────────────────────────
NimBLECharacteristic *pEmgChar = nullptr;
NimBLECharacteristic *pImuChar = nullptr;
bool deviceConnected = false;

// ── Buffers ───────────────────────────────────────────────────────────────────
uint8_t emgBuffer[22];
uint8_t imuBuffer[12];

// ─────────────────────────────────────────────────────────────────────────────
// I2C Bus Recovery
// ─────────────────────────────────────────────────────────────────────────────
static void i2cBusRecovery()
{
    Wire.end();
    pinMode(I2C_SDA, INPUT_PULLUP);
    pinMode(I2C_SCL, OUTPUT);

    for (int i = 0; i < 16; i++)
    {
        digitalWrite(I2C_SCL, LOW);
        delayMicroseconds(5);
        digitalWrite(I2C_SCL, HIGH);
        delayMicroseconds(5);
        if (digitalRead(I2C_SDA) == HIGH)
            break;
    }

    pinMode(I2C_SDA, OUTPUT);
    digitalWrite(I2C_SDA, LOW);
    delayMicroseconds(5);
    digitalWrite(I2C_SCL, HIGH);
    delayMicroseconds(5);
    digitalWrite(I2C_SDA, HIGH);
    delayMicroseconds(5);

    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(400000);
}

static void i2cReinit()
{
    Serial.println("[I2C] Bus reinit...");
    i2cBusRecovery();
    delay(10);
    lastI2CReinit = millis();
}

// ─────────────────────────────────────────────────────────────────────────────
// AS5600 Burst Read
// ─────────────────────────────────────────────────────────────────────────────
enum AS5600Result { AS5600_OK, AS5600_I2C_ERR, AS5600_NO_MAG, AS5600_WEAK, AS5600_STRONG };

struct AS5600Reading
{
    int16_t       angle;
    AS5600Result  status;
};

static AS5600Reading as5600Read()
{
    AS5600Reading r = { ANGLE_FAULT_SENTINEL, AS5600_I2C_ERR };

    for (uint8_t attempt = 0; attempt < I2C_MAX_RETRIES; attempt++)
    {
        Wire.beginTransmission(AS5600_ADDR);
        Wire.write(AS5600_REG_STATUS);
        uint8_t err = Wire.endTransmission(true);
        if (err != 0)
        {
            delayMicroseconds(I2C_RETRY_DELAY_US);
            continue;
        }

        uint8_t got = Wire.requestFrom((uint8_t)AS5600_ADDR, (uint8_t)3);
        if (got != 3)
        {
            delayMicroseconds(I2C_RETRY_DELAY_US);
            continue;
        }

        uint8_t status = Wire.read();
        uint8_t rawHi  = Wire.read();
        uint8_t rawLo  = Wire.read();

        if (!(status & AS5600_STATUS_MD))
        {
            r.status = AS5600_NO_MAG;
            r.angle  = ANGLE_FAULT_SENTINEL;
            return r;
        }

        uint16_t raw = ((uint16_t)rawHi << 8 | rawLo) & AS5600_ANGLE_MASK;
        r.angle = (int16_t)raw;

        if (status & AS5600_STATUS_MH)
            r.status = AS5600_STRONG;
        else if (status & AS5600_STATUS_ML)
            r.status = AS5600_WEAK;
        else
            r.status = AS5600_OK;

        consecutiveI2CFails = 0;
        return r;
    }

    consecutiveI2CFails++;
    if (consecutiveI2CFails >= 10 && (millis() - lastI2CReinit > I2C_REINIT_INTERVAL))
    {
        i2cReinit();
        consecutiveI2CFails = 0;
    }

    return r;
}

static const char* as5600StatusStr(AS5600Result s)
{
    switch (s)
    {
        case AS5600_OK:      return "OK";
        case AS5600_I2C_ERR: return "I2C_ERR";
        case AS5600_NO_MAG:  return "NO_MAG";
        case AS5600_WEAK:    return "WEAK";
        case AS5600_STRONG:  return "STRONG";
        default:             return "?";
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BLE Callbacks
// ─────────────────────────────────────────────────────────────────────────────
class SleeveServerCallbacks : public NimBLEServerCallbacks
{
    void onConnect(NimBLEServer *pServer) override
    {
        deviceConnected = true;
        Serial.println("[BLE] Connected");
    }
    void onDisconnect(NimBLEServer *pServer) override
    {
        deviceConnected = false;
        Serial.println("[BLE] Disconnected — re-advertising");
        NimBLEDevice::startAdvertising();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// setup()
// ─────────────────────────────────────────────────────────────────────────────
void setup()
{
    Serial.begin(115200);
    Serial.println("\n[BOOT] Smart Sleeve Firmware v2.1");

    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    i2cBusRecovery();
    delay(50);

    Wire.beginTransmission(AS5600_ADDR);
    uint8_t ack = Wire.endTransmission(true);
    if (ack == 0)
        Serial.println("[I2C] AS5600 found at 0x36");
    else
        Serial.printf("[I2C] ERROR: AS5600 not found (err=%d). Check wiring!\n", ack);

    AS5600Reading warmup = as5600Read();
    Serial.printf("[I2C] Warmup: angle=%d status=%s\n", warmup.angle, as5600StatusStr(warmup.status));

    NimBLEDevice::init("SMART-SLEEVE-01");
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);

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

    Serial.println("[BLE] Advertising as 'SMART-SLEEVE-01'");
}

// ─────────────────────────────────────────────────────────────────────────────
// loop()
// ─────────────────────────────────────────────────────────────────────────────
void loop()
{
    static uint32_t lastSample = 0;
    static uint32_t lastDebug  = 0;

    if (!deviceConnected)
        return;

    uint32_t now = millis();
    if (now - lastSample < 20)
        return;
    lastSample = now;

    int16_t emgRaw = (int16_t)analogRead(EMG_PIN);
    AS5600Reading angle = as5600Read();

    // ── EMG packet (22 bytes) ─────────────────────────────────────────────────
    emgBuffer[0] = EMG_HEADER;
    memcpy(&emgBuffer[1], &now, 4);
    memcpy(&emgBuffer[5], &emgRaw, 2);
    memset(&emgBuffer[7], 0, 14);

    uint8_t ck = 0;
    for (int i = 0; i < 21; i++)
        ck ^= emgBuffer[i];
    emgBuffer[21] = ck;

    pEmgChar->setValue(emgBuffer, 22);
    pEmgChar->notify();

    // ── IMU packet (12 bytes) ─────────────────────────────────────────────────
    int16_t angleVal = angle.angle;
    int16_t pitch = 0;
    int16_t yaw   = 0;

    imuBuffer[0] = IMU_HEADER;
    memcpy(&imuBuffer[1], &now, 4);
    memcpy(&imuBuffer[5], &angleVal, 2);
    memcpy(&imuBuffer[7], &pitch, 2);
    memcpy(&imuBuffer[9], &yaw, 2);

    uint8_t ick = 0;
    for (int i = 0; i < 11; i++)
        ick ^= imuBuffer[i];
    imuBuffer[11] = ick;

    pImuChar->setValue(imuBuffer, 12);
    pImuChar->notify();

    // ── Debug (2 Hz) ──────────────────────────────────────────────────────────
    if (now - lastDebug >= 500)
    {
        lastDebug = now;
        Serial.printf("[DATA] EMG=%4d  Angle=%4d (%s)\n",
                      emgRaw, angle.angle, as5600StatusStr(angle.status));
    }
}