/**
 * IIRFilter.ts
 * ------------------------------------------------------------------
 * Implements a generic Second-Order Section (Biquad) IIR filter.
 * Used for building higher-order filters (like Butterworth) or
 * standalone filters (like Notch).
 * 
 * Uses Direct Form I implementation for simplicity and stability.
 * Difference equation:
 * y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
 * ------------------------------------------------------------------
 */

export class BiquadFilter {
  // Coefficients
  private b0: number = 1;
  private b1: number = 0;
  private b2: number = 0;
  private a1: number = 0;
  private a2: number = 0;

  // State buffers (Previous inputs/outputs)
  private x1: number = 0; // x[n-1]
  private x2: number = 0; // x[n-2]
  private y1: number = 0; // y[n-1]
  private y2: number = 0; // y[n-2]

  constructor(b: number[], a: number[]) {
    this.updateCoefficients(b, a);
  }

  /**
   * Updates the filter coefficients.
   * @param b Numerator coefficients [b0, b1, b2]
   * @param a Denominator coefficients [a0, a1, a2] (a0 is usually 1)
   */
  public updateCoefficients(b: number[], a: number[]): void {
    if (b.length !== 3 || a.length !== 3) {
      throw new Error("Biquad filter requires 3 numerator (b) and 3 denominator (a) coefficients.");
    }

    // Normalize by a0 if it's not 1
    const a0 = a[0];
    if (Math.abs(a0) < 1e-10) {
      throw new Error("a0 cannot be zero.");
    }

    this.b0 = b[0] / a0;
    this.b1 = b[1] / a0;
    this.b2 = b[2] / a0;
    this.a1 = a[1] / a0;
    this.a2 = a[2] / a0;
    
    this.reset();
  }

  /**
   * Processes a single sample through the filter.
   */
  public process(x: number): number {
    // y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
    const y = (this.b0 * x) + (this.b1 * this.x1) + (this.b2 * this.x2) 
                            - (this.a1 * this.y1) - (this.a2 * this.y2);

    // Shift state
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;

    return y;
  }

  /**
   * Resets the internal state (buffers) to zero.
   * Useful when starting a new stream or recovering from instability.
   */
  public reset(): void {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }
}
