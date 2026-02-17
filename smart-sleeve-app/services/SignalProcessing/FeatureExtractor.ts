/**
 * FeatureExtractor.ts
 * -----------------------------------------------------
 * Service to extract Time-Domain features (RMS, MAV) from
 * filtered EMG signals.
 * -----------------------------------------------------
 */

export interface EMGFeatures {
  rms: number[];
  mav: number[];
}

export class FeatureExtractor {
  /**
   * Calculates Root Mean Square (RMS) for each channel.
   * RMS is a proxy for muscle force/effort.
   */
  public static calculateRMS(samples: number[][]): number[] {
    if (samples.length === 0) return [];
    
    const numChannels = samples[0].length;
    const numSamples = samples.length;
    const rms = new Array(numChannels).fill(0);

    for (let ch = 0; ch < numChannels; ch++) {
      let sumSquares = 0;
      for (let s = 0; s < numSamples; s++) {
        sumSquares += samples[s][ch] * samples[s][ch];
      }
      rms[ch] = Math.sqrt(sumSquares / numSamples);
    }

    return rms;
  }

  /**
   * Calculates Mean Absolute Value (MAV) for each channel.
   * MAV is a proxy for muscle activation onset.
   */
  public static calculateMAV(samples: number[][]): number[] {
    if (samples.length === 0) return [];

    const numChannels = samples[0].length;
    const numSamples = samples.length;
    const mav = new Array(numChannels).fill(0);

    for (let ch = 0; ch < numChannels; ch++) {
      let sumAbs = 0;
      for (let s = 0; s < numSamples; s++) {
        sumAbs += Math.abs(samples[s][ch]);
      }
      mav[ch] = sumAbs / numSamples;
    }

    return mav;
  }

  /**
   * Extracts all requested features from a buffer of EMG samples.
   */
  public static extractFeatures(buffer: number[][]): EMGFeatures {
    return {
      rms: this.calculateRMS(buffer),
      mav: this.calculateMAV(buffer),
    };
  }
}
