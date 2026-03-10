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

import { EMGData, IMUData, SleeveScenario } from '../SleeveConnector/ISleeveConnector';

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
  
  // Smoothing state for "Target Glide"
  private currentEMGAmplitude: number = 0.05;
  private currentKneeAngle: number = 0;

  constructor(initialScenario: SleeveScenario = 'REST') {
    this.scenario = initialScenario;
    this.startTime = Date.now();
    
    // Set initial values based on scenario
    this.currentEMGAmplitude = initialScenario === 'REST' ? 0.05 : 0.5;
    this.currentKneeAngle = initialScenario === 'REST' ? 0 : 45;
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
    const targetAmplitude =
      this.scenario === 'REST'
        ? 0.05
        : this.scenario === 'FLEX'
        ? 0.8
        : this.scenario === 'SQUAT'
        ? 0.5
        : 0.1;

    // Smoothly transition the current amplitude toward the target
    const smoothingFactor = 0.15; // Adjusted for human contraction speed (~200ms)
    this.currentEMGAmplitude += (targetAmplitude - this.currentEMGAmplitude) * smoothingFactor;
    
    const amplitude = this.currentEMGAmplitude;

    // Time in seconds for frequency generation
    const t = (timestamp - this.startTime) / 1000;

    // Simulate raw EMG signal components:
    // 1. High Frequency "Muscle Sizzle" (50Hz - 150Hz white noise bursts) - KEPT by Bandpass
    const muscleSignal = () => (Math.random() - 0.5) * 2 * amplitude; 

    // 2. Line Interference (60Hz Sine Wave) - REMOVED by Notch 
    // DISABLED at 50Hz sampling due to aliasing (aliases to 10Hz, which passes through HPF)
    const lineNoise = 0; 

    // 3. Motion Artifact (Low Frequency drift < 5Hz) - REMOVED by High Pass
    // Kept deliberately small (0.15) so REST muscle data looks clean even
    // before the HPF fully settles. Real resting EMG baseline is < 20 µV.
    const motionArtifact = Math.sin(2 * Math.PI * 1.5 * t) * 0.15;

    // Combine them
    const generateValue = (channelIdx: number) => {
       // Zero-centered random noise floor
       const noiseFloor = (Math.random() - 0.5) * 0.02; // Quiet noise floor
       
       // CLINICAL WEIGHTING:
       // CH0, CH1 = Quads (VMO, VL)
       // CH2, CH3 = Hamstrings (Semi, Biceps Fem)
       let channelWeight = 1.0;
       
       if (this.scenario === 'FLEX') {
         // Quad-focused exercises: Quads are high, Hamstrings are low (antagonist)
         if (channelIdx >= 2) channelWeight = 0.2; 
       } else if (this.scenario === 'SQUAT') {
         // Squatting: Co-contraction of both Quads and Hamstrings for stability
         channelWeight = 0.7 + (Math.random() * 0.3);
       } else if (this.scenario === 'REST') {
         channelWeight = 1.0; // All low anyway
       }

       const signal = muscleSignal() * channelWeight;
       
       if (this.scenario === 'REST') {
           // REST: pure low-amplitude noise + tiny motion artifact only
           // The HPF will clean the motion artifact; what's left should be ~0
           return noiseFloor + motionArtifact;
       }
       return signal + noiseFloor + motionArtifact;
    };

    const channels = Array.from({ length: numChannels }, (_, idx) => generateValue(idx));

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
   * 
   * NOTE: With AS5048A magnetic encoder integration, this now
   * simulates knee flexion angle measurement:
   * - roll: Knee flexion angle (0-140°, where 0° = full extension)
   * - pitch: Unused (set to 0)
   * - yaw: Unused (set to 0)
   * 
   * Realistic knee flexion ranges:
   * - REST: 0-10° (standing/slight bend)
   * - FLEX: 60-120° (active knee flexion exercise)
   * - SQUAT: 0-120° (full squat cycle)
   */
  generateIMUFrame(): IMUData {
    const timestamp = Date.now();
    const t = (timestamp - this.startTime) / 1000; // seconds since start

    let targetKneeAngle = 0;

    switch (this.scenario) {
      case 'REST':
        // Standing position with small natural sway (0-10°)
        targetKneeAngle = 5 + Math.sin(t * 0.5) * 5;
        break;

      case 'FLEX':
        // Active knee flexion exercise (60-120° oscillation at ~0.5 Hz)
        targetKneeAngle = 90 + Math.sin(t * Math.PI) * 30;
        break;

      case 'SQUAT':
        // Full squat cycle (0-120° at ~0.3 Hz)
        const squatCycle = Math.abs(Math.sin(t * 0.6));
        targetKneeAngle = squatCycle * 120;
        break;

      default:
        targetKneeAngle = 0;
        break;
    }

    // Smoothly transition the current angle toward the target
    // Factor of 0.1 at 50Hz gives a nice organic movement
    const angleSmoothingFactor = 0.1;
    this.currentKneeAngle += (targetKneeAngle - this.currentKneeAngle) * angleSmoothingFactor;
    
    let kneeFlexionAngle = this.currentKneeAngle;

    // Add small noise to simulate AS5048A resolution (±0.05° typical accuracy)
    const encoderNoise = (Math.random() - 0.5) * 0.1;
    kneeFlexionAngle += encoderNoise;

    // Clamp to realistic knee flexion range (0-140°)
    kneeFlexionAngle = Math.max(0, Math.min(140, kneeFlexionAngle));

    const checksum = computeChecksum([kneeFlexionAngle, 0, 0]);

    return {
      header: 0xb1, // Protocol header for angle/IMU frames
      timestamp,
      roll: kneeFlexionAngle,  // AS5048A knee flexion angle (0-140°)
      pitch: 0,                 // Unused with magnetic encoder
      yaw: 0,                   // Unused with magnetic encoder
      checksum,
    };
  }

}
