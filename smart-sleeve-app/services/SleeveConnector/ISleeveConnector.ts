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
 * Represents one motion/angle frame coming from the sleeve.
 * 
 * HARDWARE NOTE (AS5048A Magnetic Encoder):
 * With the AS5048A magnetic encoder integration, this structure
 * now primarily represents knee flexion angle measurement:
 * 
 * - roll: Knee flexion angle in degrees (0-140°)
 *   - 0° = Full knee extension (standing straight)
 *   - 90° = Right angle bend
 *   - 120-140° = Deep squat position
 * 
 * - pitch: Unused (set to 0) - reserved for future multi-axis sensing
 * - yaw: Unused (set to 0) - reserved for future multi-axis sensing
 * 
 * Legacy IMU Support:
 * If using a traditional IMU (gyro/accelerometer), the fields
 * retain their original meaning (roll, pitch, yaw orientation).
 * -----------------------------------------------------
 */
export interface IMUData {
  header: number;
  timestamp: number;
  roll: number;      // Knee flexion angle (0-140°) with AS5048A encoder
  pitch: number;     // Unused with encoder (0), or pitch angle with IMU
  yaw: number;       // Unused with encoder (0), or yaw angle with IMU
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

  /**
   * Update the movement scenario (Mock only, no-op for Real).
   */
  setScenario(scenario: SleeveScenario): void;
}
