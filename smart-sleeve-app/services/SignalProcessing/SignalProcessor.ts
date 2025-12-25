/**
 * SignalProcessor.ts
 * ------------------------------------------------------------------
 * Main service to process raw EMG data.
 * Applies a 60Hz Notch Filter and a 20-500Hz Bandpass Filter (via HPF+LPF).
 * ------------------------------------------------------------------
 */

import { EMGData } from "../MockBleService/ISleeveConnector";
import { FilterCoefficients } from "./FilterCoefficients";
import { BiquadFilter } from "./IIRFilter";

const DEFAULT_SAMPLE_RATE = 1000; // Hz
const NOTCH_FREQ = 60;
const HP_FREQ = 20;
const LP_FREQ = 500;

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
        const filter = new ChannelFilter(this.sampleRate);
        // We need to re-initialize the ChannelFilter with custom freqs.
        // Since ChannelFilter constructor currently hardcodes them, 
        // we should refactor ChannelFilter to accept them or just move logic here.
        // Let's refactor ChannelFilter class below/above to accept options.
        // But since ChannelFilter is internal, I'll update it now.
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
    // 1. Notch Filter 
    const notchCoeffs = FilterCoefficients.designNotch(notchFreq, fs, 4.0);
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
