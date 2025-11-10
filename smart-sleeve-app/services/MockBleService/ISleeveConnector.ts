export interface EMGPacket {
  timestamp: number;        // ms since epoch
  channels: number[];       // EMG readings from all electrodes
}

export interface IMUPacket {
  timestamp: number;
  angle: number;            // joint angle in degrees
  acceleration: [number, number, number]; // m/s²
  gyro: [number, number, number];         // deg/s
}

export interface ConnectionStatus {
  connected: boolean;
  deviceId?: string;
  lastUpdated?: number;
}

export interface ISleeveConnector {
  // Scan for nearby sleeve devices. //
  scan(): Promise<string[]>;

  // Connect to a device by ID. //
  connect(deviceId: string): Promise<void>;

  // Disconnect from the current device. //
  disconnect(): Promise<void>;

  // Receive EMG packets in real time. //
  subscribeToEMG(callback: (packet: EMGPacket) => void): void;

  // Receive IMU packets in real time. //
  subscribeToIMU(callback: (packet: IMUPacket) => void): void;

  // Listen for connection state updates. //
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void;
}

