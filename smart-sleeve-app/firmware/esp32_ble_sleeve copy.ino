#include <NimBLEDevice.h>
#include <Wire.h>
#include <AS5600.h>

// ── BLE UUIDs (match constants/ble.ts) ────────────────────────────────────────
#define SERVICE_UUID            "e0d10001-6b6e-4c52-9c3b-6a8e858c5d93"
#define EMG_CHARACTERISTIC_UUID "e0d10002-6b6e-4c52-9c3b-6a8e858c5d93"
#define IMU_CHARACTERISTIC_UUID "e0d10003-6b6e-4c52-9c3b-6a8e858c5d93"

// ── Pins (SparkFun ESP32 Thing Plus) ──────────────────────────────────────────
const int EMG_PIN = 34;
const int I2C_SDA = 23;
const int I2C_SCL = 22;

// ── Protocol ──────────────────────────────────────────────────────────────────
const uint8_t  EMG_HEADER           = 0xA1;
const uint8_t  IMU_HEADER           = 0xB1;
const int16_t  ANGLE_FAULT_SENTINEL = 0x7FFF;

// ── AS5600 ────────────────────────────────────────────────────────────────────
AS5600 encoder;

// ── BLE ───────────────────────────────────────────────────────────────────────
NimBLECharacteristic *pEmgChar = nullptr;
NimBLECharacteristic *pImuChar = nullptr;
bool deviceConnected = false;

// ── Buffers ───────────────────────────────────────────────────────────────────
uint8_t emgBuffer[22];
uint8_t imuBuffer[12];

// ── Median filter (window of 5) ──────────────────────────────────────────────
const int FILT_SIZE = 5;
uint16_t  filtBuf[FILT_SIZE];
int       filtIdx = 0;
bool      filtReady = false;

uint16_t medianFilter(uint16_t val)
{
    filtBuf[filtIdx] = val;
    filtIdx = (filtIdx + 1) % FILT_SIZE;
    if (filtIdx == 0) filtReady = true;

    int n = filtReady ? FILT_SIZE : filtIdx;
    if (n == 0) return val;

    uint16_t tmp[FILT_SIZE];
    memcpy(tmp, filtBuf, n * sizeof(uint16_t));

    // Insertion sort
    for (int i = 1; i < n; i++)
    {
        uint16_t k = tmp[i];
        int j = i - 1;
        while (j >= 0 && tmp[j] > k) { tmp[j+1] = tmp[j]; j--; }
        tmp[j+1] = k;
    }
    return tmp[n / 2];
}

// ── Cached sensor state (updated every 200ms, not every frame) ────────────────
bool     sensorOk     = false;
bool     magnetOk     = false;
uint32_t lastCheckMs  = 0;
const uint32_t CHECK_INTERVAL = 200;

void updateSensorStatus()
{
    uint32_t now = millis();
    if (now - lastCheckMs < CHECK_INTERVAL) return;
    lastCheckMs = now;

    sensorOk = encoder.isConnected();
    if (sensorOk)
        magnetOk = encoder.detectMagnet();
    else
        magnetOk = false;
}

// ── Read angle: one I2C call, no status checks ───────────────────────────────
int16_t readAngle()
{
    updateSensorStatus();

    if (!sensorOk || !magnetOk)
        return ANGLE_FAULT_SENTINEL;

    uint16_t raw = encoder.rawAngle();
    return (int16_t)medianFilter(raw);
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
    Serial.println("\n[BOOT] Smart Sleeve v3.1");

    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(100000);
    delay(50);

    encoder.begin();

    if (encoder.isConnected())
    {
        Serial.println("[AS5600] Found");
        bool mag = encoder.detectMagnet();
        Serial.printf("[AS5600] Magnet: %s\n", mag ? "YES" : "NO — place diametric magnet on chip");
        if (mag)
            Serial.printf("[AS5600] Raw: %d  Deg: %.1f\n",
                          encoder.rawAngle(),
                          encoder.rawAngle() * 360.0 / 4096.0);
    }
    else
    {
        Serial.println("[AS5600] NOT FOUND — check SDA=23 SCL=22");
    }

    memset(filtBuf, 0, sizeof(filtBuf));

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
    Serial.println("──────────────────────────────────────");
}

// ─────────────────────────────────────────────────────────────────────────────
// loop()
// ─────────────────────────────────────────────────────────────────────────────
void loop()
{
    static uint32_t lastSample = 0;
    static uint32_t lastDebug  = 0;

    uint32_t now = millis();

    // ── Debug at 2 Hz (always, even without BLE) ──────────────────────────────
    if (now - lastDebug >= 500)
    {
        lastDebug = now;
        int16_t emgDbg = (int16_t)analogRead(EMG_PIN);
        int16_t angDbg = readAngle();
        float deg = (angDbg == ANGLE_FAULT_SENTINEL) ? -1.0 :
                    angDbg * 360.0 / 4096.0;

        if (angDbg == ANGLE_FAULT_SENTINEL)
            Serial.printf("[DATA] EMG=%4d  Angle=FAULT(%s%s)  BLE=%s\n",
                          emgDbg,
                          sensorOk ? "" : "NO_SENSOR ",
                          magnetOk ? "" : "NO_MAGNET",
                          deviceConnected ? "YES" : "no");
        else
            Serial.printf("[DATA] EMG=%4d  Raw=%4d  Deg=%5.1f  BLE=%s\n",
                          emgDbg, angDbg, deg,
                          deviceConnected ? "YES" : "no");
    }

    // ── BLE packets at 50 Hz ──────────────────────────────────────────────────
    if (!deviceConnected) return;
    if (now - lastSample < 20) return;
    lastSample = now;

    int16_t emgRaw    = (int16_t)analogRead(EMG_PIN);
    int16_t angleVal  = readAngle();

    // EMG packet (22 bytes)
    emgBuffer[0] = EMG_HEADER;
    memcpy(&emgBuffer[1], &now, 4);
    memcpy(&emgBuffer[5], &emgRaw, 2);
    memset(&emgBuffer[7], 0, 14);
    uint8_t ck = 0;
    for (int i = 0; i < 21; i++) ck ^= emgBuffer[i];
    emgBuffer[21] = ck;
    pEmgChar->setValue(emgBuffer, 22);
    pEmgChar->notify();

    // IMU packet (12 bytes)
    int16_t pitch = 0, yaw = 0;
    imuBuffer[0] = IMU_HEADER;
    memcpy(&imuBuffer[1], &now, 4);
    memcpy(&imuBuffer[5], &angleVal, 2);
    memcpy(&imuBuffer[7], &pitch, 2);
    memcpy(&imuBuffer[9], &yaw, 2);
    uint8_t ick = 0;
    for (int i = 0; i < 11; i++) ick ^= imuBuffer[i];
    imuBuffer[11] = ick;
    pImuChar->setValue(imuBuffer, 12);
    pImuChar->notify();
}