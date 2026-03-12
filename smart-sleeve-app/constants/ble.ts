// Derived from Architecture Report v2.0
// Configuration for the Smart Sleeve BLE Protocol

export const SERVICE_UUID = "e0d10001-6b6e-4c52-9c3b-6a8e858c5d93";
export const EMG_CHAR_UUID = "e0d10002-6b6e-4c52-9c3b-6a8e858c5d93";
export const IMU_CHAR_UUID = "e0d10003-6b6e-4c52-9c3b-6a8e858c5d93";

// Hardware Scan Filter
export const DEVICE_NAME_PREFIX = "SMART-SLEEVE";

// Protocol Headers
export const EMG_HEADER = 0xa1;
export const IMU_HEADER = 0xb1;

// Protocol Contract
export const BLE_PACKET_ENDIANNESS = "little-endian";
export const BLE_CHECKSUM_ALGORITHM = "xor-byte";
export const EMG_PACKET_LENGTH = 22;
export const IMU_PACKET_LENGTH = 12;
export const EMG_CHANNEL_COUNT = 8;
export const BLE_SAMPLE_RATE_HZ = 50;
export const BLE_FRAME_INTERVAL_MS = 1000 / BLE_SAMPLE_RATE_HZ;
export const EMG_STALE_TIMEOUT_MS = 1000;
export const IMU_STALE_TIMEOUT_MS = 1000;

// Angle Encoding Contract
export const KNEE_ANGLE_FAULT_SENTINEL = 0x7fff;
export const KNEE_ANGLE_MAX_DEGREES = 140;
export const KNEE_ANGLE_AS5600_RAW_TICKS = 4096;
export const KNEE_ANGLE_LEGACY_RAW_TICKS = 16384;

// Transport Lifecycle Contract
export const BLE_SCAN_TIMEOUT_MS = 5000;
export const BLE_RECONNECT_DELAY_MS = 1500;
export const BLE_MAX_RECONNECT_ATTEMPTS = 3;
