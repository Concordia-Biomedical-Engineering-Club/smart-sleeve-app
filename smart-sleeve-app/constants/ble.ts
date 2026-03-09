// Derived from Architecture Report v2.0
// Configuration for the Smart Sleeve BLE Protocol

export const SERVICE_UUID = 'e0d10001-6b6e-4c52-9c3b-6a8e858c5d93';
export const EMG_CHAR_UUID = 'e0d10002-6b6e-4c52-9c3b-6a8e858c5d93';
export const IMU_CHAR_UUID = 'e0d10003-6b6e-4c52-9c3b-6a8e858c5d93';

// Hardware Scan Filter
export const DEVICE_NAME_PREFIX = 'SMART-SLEEVE';

// Protocol Headers
export const EMG_HEADER = 0xA1;
export const IMU_HEADER = 0xB1;
