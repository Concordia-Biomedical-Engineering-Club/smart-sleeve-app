import { normalize } from '@/services/NormalizationService';
import type { CalibrationCoefficients } from '@/store/userSlice';

export interface EMGFeatures {
  rms: number[];
  mav: number[];
}

export interface NormalizedEMGFeatures extends EMGFeatures {
  rmsNormalized: number[] | null;
}

export class FeatureExtractor {
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

  public static extractFeatures(buffer: number[][]): EMGFeatures {
    return {
      rms: this.calculateRMS(buffer),
      mav: this.calculateMAV(buffer),
    };
  }

  public static extractFeaturesWithNormalization(
    buffer: number[][],
    coeffs: CalibrationCoefficients | null
  ): NormalizedEMGFeatures {
    const base = this.extractFeatures(buffer);
    const rmsNormalized =
      coeffs && coeffs.calibratedAt !== null
        ? normalize(base.rms, coeffs)
        : null;
    return { ...base, rmsNormalized };
  }
}