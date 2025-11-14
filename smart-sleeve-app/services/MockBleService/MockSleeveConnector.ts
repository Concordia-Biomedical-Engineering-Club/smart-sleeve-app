/**
 * MockSleeveConnector.ts
 * -----------------------------------------------------
 * Simulates a real-time BLE sleeve device by emitting
 * EMG and IMU frames at a fixed frequency. Uses the
 * SleeveDataGenerator to produce realistic mock data
 * for different movement scenarios.
 * -----------------------------------------------------
 */

import {
  ISleeveConnector,
  EMGData,
  IMUData,
  ConnectionStatus,
  SleeveScenario,
} from './ISleeveConnector';
import { SleeveDataGenerator } from './SleeveDataGenerator';

export class MockSleeveConnector implements ISleeveConnector {
  private emgSubscribers: ((frame: EMGData) => void)[] = [];
  private imuSubscribers: ((frame: IMUData) => void)[] = [];
  private connectionSubscribers: ((status: ConnectionStatus) => void)[] = [];

  private isConnected = false;
  private deviceId: string | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;

  private readonly dataGenerator: SleeveDataGenerator;

  constructor(initialScenario: SleeveScenario = 'REST') {
    this.dataGenerator = new SleeveDataGenerator(initialScenario);
  }

  /**
   * Scan for available devices. In the mock implementation we
   * simply return two fake device identifiers after a short
   * artificial delay.
   */
  async scan(): Promise<string[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return ['MockSleeve-01', 'MockSleeve-02'];
  }

  /**
   * Connect to a mock device and start emitting EMG + IMU frames
   * at a fixed frequency (e.g., 50 Hz). Subscribers will begin
   * receiving data shortly after this resolves.
   */
  async connect(deviceId: string): Promise<void> {
    this.deviceId = deviceId;
    this.isConnected = true;
    this.emitConnectionStatus(true);

    const intervalMs = 20; // 50 Hz
    this.timerId = setInterval(() => {
      const emgFrame = this.dataGenerator.generateEMGFrame();
      const imuFrame = this.dataGenerator.generateIMUFrame();

      this.emgSubscribers.forEach((callback) => callback(emgFrame));
      this.imuSubscribers.forEach((callback) => callback(imuFrame));
    }, intervalMs);
  }

  /**
   * Disconnect from the mock device and stop emitting frames.
   * All existing subscribers remain registered but will not
   * receive any further data until connect() is called again.
   */
  async disconnect(): Promise<void> {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    this.timerId = null;
    this.isConnected = false;
    this.emitConnectionStatus(false);
  }

  /**
   * Register a callback that will receive EMGData frames as they
   * are generated. Callbacks are invoked on the timer interval.
   */
  subscribeToEMG(callback: (frame: EMGData) => void): void {
    this.emgSubscribers.push(callback);
  }

  /**
   * Register a callback that will receive IMUData frames as they
   * are generated. Callbacks are invoked on the timer interval.
   */
  subscribeToIMU(callback: (frame: IMUData) => void): void {
    this.imuSubscribers.push(callback);
  }

  /**
   * Register a callback for connection status changes so that
   * the UI can react to connect / disconnect events.
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.connectionSubscribers.push(callback);
  }

  /**
   * Update the current scenario (REST, FLEX, SQUAT). This simply
   * forwards the change to the SleeveDataGenerator so that
   * subsequent frames reflect the new movement profile.
   */
  setScenario(scenario: SleeveScenario): void {
    this.dataGenerator.setScenario(scenario);
  }

  // -----------------------------------------------------
  // Private helpers
  // -----------------------------------------------------

  /**
   * Emit a ConnectionStatus event to all registered subscribers.
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

