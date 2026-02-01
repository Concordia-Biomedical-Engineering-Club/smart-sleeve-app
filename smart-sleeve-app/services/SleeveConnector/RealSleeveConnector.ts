/**
 * RealSleeveConnector.ts
 * -----------------------------------------------------
 * Stub for real hardware communication over BLE.
 * 
 * HARDWARE INTEGRATION:
 * - EMG: 8-channel muscle activity data via BLE notifications
 * - Angle Sensor: AS5048A magnetic encoder for knee flexion (0-140°)
 *   - Firmware reads AS5048A via SPI at 50 Hz
 *   - Angle data transmitted via BLE in IMUData.roll field
 * 
 * Currently just logs activity to prove the factory
 * correctly switches between Mock and Real implementations.
 * -----------------------------------------------------
 */

import {
  ISleeveConnector,
  EMGData,
  IMUData,
  ConnectionStatus,
} from './ISleeveConnector';

export class RealSleeveConnector implements ISleeveConnector {
  private emgSubscribers: ((frame: EMGData) => void)[] = [];
  private imuSubscribers: ((frame: IMUData) => void)[] = [];
  private connectionSubscribers: ((status: ConnectionStatus) => void)[] = [];

  private isConnected = false;
  private deviceId: string | null = null;

  /**
   * Scan for real BLE devices. (Stubbed)
   */
  async scan(): Promise<string[]> {
    console.log('[RealSleeveConnector] Scanning for BLE devices...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return ['REAL-SLEEVE-01-STUB'];
  }

  /**
   * Connect to a real device. (Stubbed)
   */
  async connect(deviceId: string): Promise<void> {
    console.log(`[RealSleeveConnector] Connecting to ${deviceId}...`);
    this.deviceId = deviceId;
    this.isConnected = true;
    this.emitConnectionStatus(true);
    
    // In a real implementation, we would start the BLE notification stream here.
    console.warn('[RealSleeveConnector] BLE logic not yet implemented. No data will be emitted.');
  }

  /**
   * Disconnect from the real device. (Stubbed)
   */
  async disconnect(): Promise<void> {
    console.log('[RealSleeveConnector] Disconnecting...');
    this.isConnected = false;
    this.emitConnectionStatus(false);
  }

  /**
   * Subscribe to EMG data frames.
   */
  subscribeToEMG(callback: (data: EMGData) => void): void {
    this.emgSubscribers.push(callback);
  }

  /**
   * Subscribe to IMU data frames.
   */
  subscribeToIMU(callback: (data: IMUData) => void): void {
    this.imuSubscribers.push(callback);
  }

  /**
   * Subscribe to connection status changes.
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.connectionSubscribers.push(callback);
  }

  /**
   * Update the movement scenario. (Stubbed no-op)
   */
  setScenario(scenario: any): void {
    console.log(`[RealSleeveConnector] setScenario(${scenario}) called. No-op in real hardware.`);
  }

  /**
   * Helper to emit status to all subscribers.
   */
  private emitConnectionStatus(connected: boolean): void {
    const status: ConnectionStatus = {
      connected,
      deviceId: this.deviceId ?? undefined,
      lastUpdated: Date.now(),
    };
    this.connectionSubscribers.forEach((callback) => callback(status));
  }
}
