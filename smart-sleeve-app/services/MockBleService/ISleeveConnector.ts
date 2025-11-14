/**
 * ISleeveConnector.ts
 * -----------------------------------------------------
 * Contract for all sleeve connectors (mock and real).
 * Defines the data structures and callback signatures
 * used throughout the app for EMG and IMU streaming.
 * -----------------------------------------------------
 */

/**
 * High-level scenario used by the mock data generator.
 * This matches the movement profiles defined in the spec.
 */
export type SleeveScenario = 'REST' | 'FLEX' | 'SQUAT';

/**
 * EMGData
 * -----------------------------------------------------
 * Represents one EMG frame coming from the sleeve.
 * - header: protocol header byte/word used by firmware
 * - timestamp: ms since epoch when the sample was produced
 * - channels: EMG values for each electrode/channel
 * - checksum: simple integrity value computed over payload
 */
export interface EMGData {
  header: number;
  timestamp: number;
  channels: number[];
  checksum: number;
}

/**
 * IMUData
 * -----------------------------------------------------
 * Represents one motion frame coming from the sleeve.
 * Per spec (Section 9.2), we expose orientation as:
 * - roll, pitch, yaw (in degrees)
 * plus header, timestamp and checksum.
 */
export interface IMUData {
  header: number;
  timestamp: number;
  roll: number;
  pitch: number;
  yaw: number;
  checksum: number;
}

/**
 * ConnectionStatus
 * -----------------------------------------------------
 * Lightweight status structure for UI + debugging.
 */
export interface ConnectionStatus {
  connected: boolean;
  deviceId?: string;
  lastUpdated?: number;
}

/**
 * ISleeveConnector
 * -----------------------------------------------------
 * Common interface for all sleeve connectors. Anything
 * that plugs into the app (mock or real BLE) must
 * implement this so the rest of the code can stay
 * hardware-agnostic.
 */
export interface ISleeveConnector {
  /**
   * Scan for available sleeve devices.
   * Implementations may debounce or cache results.
   */
  scan(): Promise<string[]>;

  /**
   * Connect to a specific device by its identifier.
   * Resolves when the data stream is ready.
   */
  connect(deviceId: string): Promise<void>;

  /**
   * Disconnect from the currently connected device.
   * Implementations must stop emitting EMG/IMU frames.
   */
  disconnect(): Promise<void>;

  /**
   * Subscribe to EMG data frames.
   * The callback will be invoked at the stream frequency
   * (e.g., 50 Hz in the mock implementation).
   */
  subscribeToEMG(callback: (data: EMGData) => void): void;

  /**
   * Subscribe to IMU data frames (roll, pitch, yaw).
   */
  subscribeToIMU(callback: (data: IMUData) => void): void;

  /**
   * Subscribe to connection status updates so the UI
   * can react to connect/disconnect events.
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void;
}


