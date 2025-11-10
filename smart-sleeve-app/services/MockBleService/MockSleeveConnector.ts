
import {
  ISleeveConnector,
  EMGPacket,
  IMUPacket,
  ConnectionStatus,
} from './ISleeveConnector';

export class MockSleeveConnector implements ISleeveConnector {
  private emgSubscribers: ((packet: EMGPacket) => void)[] = [];
  private imuSubscribers: ((packet: IMUPacket) => void)[] = [];
  private connectionSubscribers: ((status: ConnectionStatus) => void)[] = [];

  private isConnected = false;
  private deviceId: string | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private scenario: 'REST' | 'FLEX' | 'SQUAT' = 'REST';
  private startTime = Date.now();

  // Scan for mock devices. //
  async scan(): Promise<string[]> {
    await new Promise((res) => setTimeout(res, 500));
    return ['MockSleeve-01', 'MockSleeve-02'];
  }

  // Connect to a mock device and start emitting data at 50Hz. //
  async connect(deviceId: string): Promise<void> {
    this.deviceId = deviceId;
    this.isConnected = true;
    this.emitConnectionStatus(true);

    const intervalMs = 20;
    this.timerId = setInterval(() => {
      const emg = this.generateEMGPacket();
      const imu = this.generateIMUPacket();

      this.emgSubscribers.forEach((cb) => cb(emg));
      this.imuSubscribers.forEach((cb) => cb(imu));
    }, intervalMs);
  }

  // Disconnect from the mock device. //
  async disconnect(): Promise<void> {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.isConnected = false;
    this.emitConnectionStatus(false);
  }

  // Subscribe to EMG data. //
  subscribeToEMG(callback: (packet: EMGPacket) => void): void {
    this.emgSubscribers.push(callback);
  }

  // Subscribe to IMU data. //
  subscribeToIMU(callback: (packet: IMUPacket) => void): void {
    this.imuSubscribers.push(callback);
  }

  // Subscribe to connection status changes. //
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.connectionSubscribers.push(callback);
  }

  // Change mock activity scenario (e.g., REST, FLEX, SQUAT). //
  setScenario(scenario: 'REST' | 'FLEX' | 'SQUAT'): void {
    this.scenario = scenario;
  }

  // -----------------------------------------------------
  // Private helpers
  // -----------------------------------------------------

  private emitConnectionStatus(connected: boolean): void {
    const status: ConnectionStatus = {
      connected,
      deviceId: this.deviceId ?? undefined,
      lastUpdated: Date.now(),
    };
    this.connectionSubscribers.forEach((cb) => cb(status));
  }

  private generateEMGPacket(): EMGPacket {
    const timestamp = Date.now();
    const numChannels = 8;

    const amplitude =
      this.scenario === 'REST'
        ? 0.05
        : this.scenario === 'FLEX'
        ? 0.8
        : this.scenario === 'SQUAT'
        ? 0.5
        : 0.1;

    const noise = () => (Math.random() - 0.5) * amplitude * 2;

    const channels = Array.from({ length: numChannels }, () => noise());
    return { timestamp, channels };
  }

  private generateIMUPacket(): IMUPacket {
    const timestamp = Date.now();
    const t = (timestamp - this.startTime) / 1000; // seconds since start

    let angle = 0;
    switch (this.scenario) {
      case 'REST':
        angle = 90 + Math.sin(t) * 2;
        break;
      case 'FLEX':
        angle = 45 + Math.sin(t * 2) * 45;
        break;
      case 'SQUAT':
        angle = 60 + Math.abs(Math.sin(t)) * 30;
        break;
    }

    const acceleration: [number, number, number] = [
      Math.sin(t) * 0.1,
      Math.cos(t) * 0.1,
      9.8,
    ];
    const gyro: [number, number, number] = [
      Math.sin(t) * 5,
      Math.cos(t) * 5,
      0,
    ];

    return { timestamp, angle, acceleration, gyro };
  }
}



