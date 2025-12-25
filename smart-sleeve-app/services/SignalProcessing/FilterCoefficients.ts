/**
 * FilterCoefficients.ts
 * ------------------------------------------------------------------
 * Helper functions to generate coefficients for IIR Biquad filters.
 * Uses the Audio EQ Cookbook formulas by Robert Bristow-Johnson.
 * ------------------------------------------------------------------
 */

export interface BiquadCoefficients {
  b: number[]; // [b0, b1, b2]
  a: number[]; // [a0, a1, a2]
}

export class FilterCoefficients {
  /**
   * Designs a 2nd-order Notch filter.
   * Removes a specific frequency (f0) with a given bandwidth (Q).
   */
  static designNotch(f0: number, fs: number, q: number = 1.0): BiquadCoefficients {
    const w0 = (2 * Math.PI * f0) / fs;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    const b0 = 1;
    const b1 = -2 * cosw0;
    const b2 = 1;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    return { b: [b0, b1, b2], a: [a0, a1, a2] };
  }

  /**
   * Designs a 2nd-order Low Pass Butterworth filter.
   */
  static designLowPass(f0: number, fs: number, q: number = 0.707): BiquadCoefficients {
    const w0 = (2 * Math.PI * f0) / fs;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    const b0 = (1 - cosw0) / 2;
    const b1 = 1 - cosw0;
    const b2 = (1 - cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    return { b: [b0, b1, b2], a: [a0, a1, a2] };
  }

  /**
   * Designs a 2nd-order High Pass Butterworth filter.
   */
  static designHighPass(f0: number, fs: number, q: number = 0.707): BiquadCoefficients {
    const w0 = (2 * Math.PI * f0) / fs;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    const b0 = (1 + cosw0) / 2;
    const b1 = -(1 + cosw0);
    const b2 = (1 + cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    return { b: [b0, b1, b2], a: [a0, a1, a2] };
  }
}
