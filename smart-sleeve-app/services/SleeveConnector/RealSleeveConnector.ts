/**
 * RealSleeveConnector.ts
 * -----------------------------------------------------
 * Actual hardware communication over BLE using react-native-ble-plx.
 * 
 * HARDWARE INTEGRATION (ESP32 / MyoWare 2.0 Wireless Shield):
 * - EMG: 8-channel muscle activity data via BLE notifications
 * - Angle Sensor: AS5048A magnetic encoder for knee flexion (0-140°)
 * 
 * BLE Characteristics:
 * - SERVICE_UUID: e0d10001-6b6e-4c52-9c3b-6a8e858c5d93
 * - EMG_CHAR_UUID: e0d10002-6b6e-4c52-9c3b-6a8e858c5d93 (Notify)
 * - IMU_CHAR_UUID: e0d10003-6b6e-4c52-9c3b-6a8e858c5d93 (Notify)
 * -----------------------------------------------------
 */

import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  ISleeveConnector,
  EMGData,
  IMUData,
  ConnectionStatus,
  SleeveScenario,
} from './ISleeveConnector';
import {
  SERVICE_UUID,
  EMG_CHAR_UUID,
  IMU_CHAR_UUID,
  DEVICE_NAME_PREFIX,
} from '@/constants/ble';

export class RealSleeveConnector implements ISleeveConnector {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private emgSubscribers: ((frame: EMGData) => void)[] = [];
  private imuSubscribers: ((frame: IMUData) => void)[] = [];
  private connectionSubscribers: ((status: ConnectionStatus) => void)[] = [];

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Request Bluetooth permissions for Android.
   */
  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    // Android 12 (API 31) and above requires specific BT permissions
    if (Platform.Version >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      );
    } 
    
    // Android 10/11 (API 23-30) legacy Bluetooth scanning via Location
    if (Platform.Version >= 23) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }

  /**
   * Scan for real BLE devices advertising our SERVICE_UUID.
   */
  async scan(): Promise<string[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('[RealSleeveConnector] Bluetooth permissions denied.');
      return [];
    }

    console.log('[RealSleeveConnector] Starting scan for:', SERVICE_UUID);
    const devicesFound: string[] = [];
    
    return new Promise((resolve) => {
      this.manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          console.error('[RealSleeveConnector] Scan error:', error);
          this.manager.stopDeviceScan();
          resolve(devicesFound);
          return;
        }

        if (device && device.name?.startsWith(DEVICE_NAME_PREFIX)) {
          console.log('[RealSleeveConnector] Found device:', device.name, device.id);
          if (!devicesFound.includes(device.id)) {
            devicesFound.push(device.id);
          }
        }
      });

      // Stop scanning after 5 seconds
      setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(devicesFound);
      }, 5000);
    });
  }

  /**
   * Connect to an ESP32 device.
   */
  async connect(deviceId: string): Promise<void> {
    try {
      console.log(`[RealSleeveConnector] Connecting to ${deviceId}...`);
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      
      this.connectedDevice = device;
      this.emitConnectionStatus(true);

      // Handle disconnection
      device.onDisconnected((error, disconnectedDevice) => {
        console.warn(`[RealSleeveConnector] Device ${disconnectedDevice.id} disconnected`);
        this.connectedDevice = null;
        this.emitConnectionStatus(false);
        // Reconnection logic: Optional depending on app state.
        // For physical rehabilitation, we might want to manually trigger reconnect.
      });

      // Setup Notifications
      this.setupNotifications(device);
      
    } catch (err) {
      console.error('[RealSleeveConnector] Connection failed:', err);
      this.emitConnectionStatus(false);
      throw err;
    }
  }

  /**
   * Setup BLE Notify listeners for EMG and IMU traits.
   */
  private setupNotifications(device: Device) {
    // 1. EMG Monitor
    device.monitorCharacteristicForService(SERVICE_UUID, EMG_CHAR_UUID, (error, char) => {
      if (error) {
        console.error('[RealSleeveConnector] EMG notification error:', error);
        return;
      }
      if (char?.value) {
        this.parseEMG(char.value);
      }
    });

    // 2. IMU Monitor
    device.monitorCharacteristicForService(SERVICE_UUID, IMU_CHAR_UUID, (error, char) => {
      if (error) {
        console.error('[RealSleeveConnector] IMU notification error:', error);
        return;
      }
      if (char?.value) {
        this.parseIMU(char.value);
      }
    });
  }

  /**
   * Parse binary EMG data (22 bytes approx):
   * [Header(1) | Timestamp(4) | Ch1-8(2 each) | Checksum(1)]
   */
  private parseEMG(base64: string) {
    const buf = Buffer.from(base64, 'base64');
    
    // Safety check: 1 + 4 + 16 + 1 = 22 bytes
    if (buf.length < 22) return;

    const header = buf.readUInt8(0);
    const timestamp = buf.readUInt32LE(1);
    const channels: number[] = [];
    
    for (let i = 0; i < 8; i++) {
        // Read each channel as int16 (signed)
        const rawValue = buf.readInt16LE(5 + (i * 2));
        
        // Scale 12-bit ADC (0 - 4095) to normalized float (0.0 - 1.0)
        // Ensure it is clamped between 0 and 1
        let scaledValue = rawValue / 4095.0;
        scaledValue = Math.max(0.0, Math.min(1.0, scaledValue));
        
        channels.push(scaledValue);
    }

    // Checksum verification
    let computedChecksum = header;
    // Include 4 bytes of timestamp
    for (let i = 0; i < 4; i++) {
      computedChecksum ^= buf.readUInt8(1 + i);
    }
    // Include 16 bytes of data (8 channels x 2 bytes)
    for (let i = 0; i < 16; i++) {
      computedChecksum ^= buf.readUInt8(5 + i);
    }

    const checksumReceived = buf.readUInt8(21);
    if (computedChecksum !== checksumReceived) {
      console.warn(`[RealSleeveConnector] EMG checksum mismatch: calc=${computedChecksum}, recv=${checksumReceived}`);
      // STABLE_MODE: To enforce strict data integrity, you can 'return' here to drop corrupted frames.
    }

    const frame: EMGData = {
      header,
      timestamp,
      channels,
      checksum: checksumReceived
    };

    this.emgSubscribers.forEach(cb => cb(frame));
  }

  /**
   * Parse binary IMU data (12 bytes):
   * [Header(1) | Timestamp(4) | Roll(2) | Pitch(2) | Yaw(2) | CRC(1)]
   */
  private parseIMU(base64: string) {
    const buf = Buffer.from(base64, 'base64');

    // [Header(1) | Timestamp(4) | Roll/Knee(2) | Pitch(2) | Yaw(2) | CRC(1)] = 12 bytes
    if (buf.length < 12) return;

    const header = buf.readUInt8(0);
    const timestamp = buf.readUInt32LE(1);
    
    // Receive data from bytes 5-10
    const rawValue = buf.readInt16LE(5);
    const pitchRaw = buf.readInt16LE(7);
    const yawRaw = buf.readInt16LE(9);
    const checksumReceived = buf.readUInt8(11);

    // Checksum verification (XOR bytes 1 through 10)
    let computedChecksum = header;
    for (let i = 0; i < 10; i++) {
      computedChecksum ^= buf.readUInt8(1 + i);
    }

    if (computedChecksum !== checksumReceived) {
       console.warn(`[RealSleeveConnector] IMU checksum mismatch: calc=${computedChecksum}, recv=${checksumReceived}`);
       // STABLE_MODE: To enforce strict data integrity, you can 'return' here to drop corrupted frames.
    }

    // Convert raw 14-bit encoder (0-16383) to degrees (0-140)
    let roll = 0;
    // Protocol sentinel: 0x7FFF (32767) indicates sensor fault
    if (rawValue === 0x7FFF) {
      console.warn('[RealSleeveConnector] Angle sensor reported FAULT');
      roll = 0; // Error state
    } else {
      const degrees = (rawValue * 360.0) / 16384.0;
      roll = Math.max(0, Math.min(140, degrees));
    }

    const frame: IMUData = {
      header,
      timestamp,
      roll,
      pitch: pitchRaw,
      yaw: yawRaw,
      checksum: checksumReceived
    };

    this.imuSubscribers.forEach(cb => cb(frame));
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
      this.emitConnectionStatus(false);
    }
  }

  subscribeToEMG(callback: (data: EMGData) => void): () => void {
    this.emgSubscribers.push(callback);
    return () => {
      this.emgSubscribers = this.emgSubscribers.filter(cb => cb !== callback);
    };
  }

  subscribeToIMU(callback: (data: IMUData) => void): () => void {
    this.imuSubscribers.push(callback);
    return () => {
      this.imuSubscribers = this.imuSubscribers.filter(cb => cb !== callback);
    };
  }

  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionSubscribers.push(callback);
    return () => {
      this.connectionSubscribers = this.connectionSubscribers.filter(cb => cb !== callback);
    };
  }

  setScenario(scenario: SleeveScenario): void {
    // Hardware doesn't care about scenario, it just streams reality.
    // This could optionally send a command to the ESP32 if firmware support it.
    console.log('[RealSleeveConnector] setScenario called for real hardware:', scenario);
  }

  private emitConnectionStatus(connected: boolean): void {
    const status: ConnectionStatus = {
      connected,
      deviceId: this.connectedDevice?.id,
      lastUpdated: Date.now(),
    };
    this.connectionSubscribers.forEach((callback) => callback(status));
  }
}
