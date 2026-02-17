/**
 * SignalProcessor.ts
 * ------------------------------------------------------------------
 * Main service to process raw EMG data.
 * Applies a 60Hz Notch Filter and a 20-500Hz Bandpass Filter (via HPF+LPF).
 * ------------------------------------------------------------------
 */

import { EMGData } from "../SleeveConnector/ISleeveConnector";
import { FilterCoefficients } from "./FilterCoefficients";
import { BiquadFilter } from "./IIRFilter";

const DEFAULT_SAMPLE_RATE = 50; // Hz - Matches BLE / Mock rate
const NOTCH_FREQ = 0; // Disabled for 50Hz (Nyquist is 25Hz)
const HP_FREQ = 5; // Standard EMG High Pass
const LP_FREQ = 24; // Anti-aliasing for 50Hz FS

export class SignalProcessor {
  private channels: ChannelFilter[] = [];
  private sampleRate: number;
  private notchFreq: number;
  private hpFreq: number;
  private lpFreq: number;

  constructor(
    sampleRate: number = DEFAULT_SAMPLE_RATE,
    notchFreq: number = NOTCH_FREQ,
    hpFreq: number = HP_FREQ,
    lpFreq: number = LP_FREQ
  ) {
    this.sampleRate = sampleRate;
    this.notchFreq = notchFreq;
    this.hpFreq = hpFreq;
    this.lpFreq = lpFreq;
  }

  /**
   * Processes a raw EMG packet and returns a new packet with filtered data.
   * Maintains state between calls.
   */
  public processEMG(packet: EMGData): EMGData {
    const rawChannels = packet.channels;
    
    // Ensure we have enough filter instances
    if (this.channels.length < rawChannels.length) {
      for (let i = this.channels.length; i < rawChannels.length; i++) {
         this.channels.push(this.createChannelFilter());
      }
    }

    // Process each channel
    const filteredChannels = rawChannels.map((sample, index) => {
      if (!this.channels[index]) {
         this.channels[index] = this.createChannelFilter();
      }
      return this.channels[index].process(sample);
    });

    return {
      ...packet,
      channels: filteredChannels,
    };
  }

  private createChannelFilter(): ChannelFilter {
      return new ChannelFilter(this.sampleRate, this.notchFreq, this.hpFreq, this.lpFreq);
  }
  
  public reset(): void {
      this.channels = [];
  }
}

/**
 * Manages the filter chain for a single EMG channel.
 */
class ChannelFilter {
  private notch: BiquadFilter;
  private highPass: BiquadFilter;
  private lowPass: BiquadFilter;

  constructor(fs: number, notchFreq: number, hpFreq: number, lpFreq: number) {
    // 1. Notch Filter (Skip if freq is 0 or exceeds Nyquist)
    const notchCoeffs = (notchFreq > 0 && notchFreq < fs / 2) 
      ? FilterCoefficients.designNotch(notchFreq, fs, 4.0)
      : { b: [1, 0, 0], a: [1, 0, 0] }; // Passthrough
    this.notch = new BiquadFilter(notchCoeffs.b, notchCoeffs.a);

    // 2. High Pass (Butterworth Q=0.707)
    const hpCoeffs = FilterCoefficients.designHighPass(hpFreq, fs, 0.707);
    this.highPass = new BiquadFilter(hpCoeffs.b, hpCoeffs.a);

    // 3. Low Pass (Butterworth Q=0.707)
    const lpCoeffs = FilterCoefficients.designLowPass(lpFreq, fs, 0.707);
    this.lowPass = new BiquadFilter(lpCoeffs.b, lpCoeffs.a);
  }

  public process(sample: number): number {
    let out = sample;
    out = this.notch.process(out);
    out = this.highPass.process(out);
    out = this.lowPass.process(out);
    return out;
  }
}
