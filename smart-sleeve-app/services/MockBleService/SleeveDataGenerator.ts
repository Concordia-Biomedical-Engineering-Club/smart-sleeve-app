/**
 * SleeveDataGenerator.ts
 * -----------------------------------------------------
 * Responsible for generating mock EMG and IMU data for
 * different movement scenarios (REST, FLEX, SQUAT).
 * This is used by MockSleeveConnector so that the
 * connector class itself stays focused on connection
 * and subscription logic.
 * -----------------------------------------------------
 */

import { EMGData, IMUData, SleeveScenario } from './ISleeveConnector';

/**
 * Computes a simple checksum over a list of numeric values.
 * The exact checksum algorithm can be swapped later to match
 * firmware behaviour; for now we keep it simple and fast.
 */
function computeChecksum(values: number[]): number {
  const sum = values.reduce((acc, value) => acc + value, 0);
  // Truncate to 8 bits to keep it compact.
  return sum & 0xff;
}

/**
 * SleeveDataGenerator
 * -----------------------------------------------------
 * Encapsulates all mock data generation logic so it can
 * be reused and tested independently from any connector.
 */
export class SleeveDataGenerator {
  private scenario: SleeveScenario;
  private readonly startTime: number;

  constructor(initialScenario: SleeveScenario = 'REST') {
    this.scenario = initialScenario;
    this.startTime = Date.now();
  }

  /**
   * Update the currently active scenario. This will change
   * the amplitude / profile of the generated EMG and IMU
   * signals without requiring any changes in the connector.
   */
  setScenario(scenario: SleeveScenario): void {
    this.scenario = scenario;
  }

  /**
   * Generate a single EMGData frame for the current scenario.
   * This simulates 8 EMG channels with different amplitudes
   * depending on REST / FLEX / SQUAT.
   */
  generateEMGFrame(): EMGData {
    const timestamp = Date.now();
    const numChannels = 8;

    // Base amplitude for the envelope
    const amplitude =
      this.scenario === 'REST'
        ? 0.05
        : this.scenario === 'FLEX'
        ? 0.8
        : this.scenario === 'SQUAT'
        ? 0.5
        : 0.1;

    // Time in seconds for frequency generation
    const t = (timestamp - this.startTime) / 1000;

    // Simulate raw EMG signal components:
    // 1. High Frequency "Muscle Sizzle" (50Hz - 150Hz white noise bursts) - KEPT by Bandpass
    const muscleSignal = () => (Math.random() - 0.5) * 2 * amplitude; 

    // 2. Line Interference (60Hz Sine Wave) - REMOVED by Notch
    const lineNoise = Math.sin(2 * Math.PI * 60 * t) * 0.3; 

    // 3. Motion Artifact (Low Frequency drift < 10Hz) - REMOVED by High Pass
    const motionArtifact = Math.sin(2 * Math.PI * 2 * t) * 0.5;

    // Combine them
    const generateValue = () => {
       // In REST, we mostly see noise and artifacts. In FLEX, we see muscle signal dominating.
       if (this.scenario === 'REST') {
           return (Math.random() * 0.05) + lineNoise + motionArtifact;
       }
       return muscleSignal() + lineNoise + motionArtifact;
    };

    const channels = Array.from({ length: numChannels }, () => generateValue());

    const checksum = computeChecksum(channels);

    return {
      header: 0xa1, // Arbitrary protocol header value for EMG frames
      timestamp,
      channels,
      checksum,
    };
  }

  /**
   * Generate a single IMUData frame for the current scenario.
   * Uses simple sinusoidal patterns to mimic joint motion
   * over time while remaining deterministic enough for demos.
   */
  generateIMUFrame(): IMUData {
    const timestamp = Date.now();
    const t = (timestamp - this.startTime) / 1000; // seconds since start

    let roll = 0;
    let pitch = 0;
    let yaw = 0;

    switch (this.scenario) {
      case 'REST':
        roll = 0 + Math.sin(t) * 2;
        pitch = 0 + Math.cos(t) * 2;
        yaw = 0;
        break;

      case 'FLEX':
        // Larger, faster oscillation to represent active flexion.
        roll = 20 + Math.sin(t * 2) * 40;
        pitch = 10 + Math.cos(t * 2) * 30;
        yaw = 0;
        break;

      case 'SQUAT':
        // Slower symmetric motion for repeated squats.
        roll = 10 + Math.abs(Math.sin(t)) * 30;
        pitch = 5 + Math.abs(Math.sin(t)) * 20;
        yaw = 0;
        break;

      default:
        break;
    }

    const checksum = computeChecksum([roll, pitch, yaw]);

    return {
      header: 0xb1, // Arbitrary protocol header for IMU frames
      timestamp,
      roll,
      pitch,
      yaw,
      checksum,
    };
  }
}
