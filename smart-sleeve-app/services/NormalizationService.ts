import { CalibrationCoefficients } from "@/store/userSlice";

const CHANNELS = 4;
const SAMPLE_RATE = 50;
export const BASELINE_DURATION_SEC = 5;
const MVC_PEAK_WINDOW = Math.round(0.5 * SAMPLE_RATE);
const MIN_MVC_BASELINE_RATIO = 1.5;

type Phase = "idle" | "baseline" | "mvc";
let _phase: Phase = "idle";
let _baselineBuffer: number[][] = [];
let _mvcBuffer: number[][] = [];

export function startBaseline(): void {
  _phase = "baseline";
  _baselineBuffer = [];
}

export function startMVC(): void {
  _phase = "mvc";
  _mvcBuffer = [];
}

export function reset(): void {
  _phase = "idle";
  _baselineBuffer = [];
  _mvcBuffer = [];
}

export function addSample(sample: number[]): void {
  if (_phase === "baseline") _baselineBuffer.push(sample.slice(0, CHANNELS));
  else if (_phase === "mvc") _mvcBuffer.push(sample.slice(0, CHANNELS));
}

export function addFrame(sample: number[]): void {
  addSample(sample);
}

export function finalizeBaseline(): number[] {
  if (_baselineBuffer.length === 0)
    throw new Error("[NormalizationService] No baseline frames collected.");
  const result = computeChannelRMS(_baselineBuffer);
  _phase = "idle";
  return result;
}

export function finalizeMVC(): number[] {
  if (_mvcBuffer.length < MVC_PEAK_WINDOW)
    throw new Error(
      `[NormalizationService] Not enough MVC frames. Need ${MVC_PEAK_WINDOW}, got ${_mvcBuffer.length}.`,
    );
  let bestSum = -Infinity;
  let bestWindowRMS: number[] = [];
  for (let i = 0; i <= _mvcBuffer.length - MVC_PEAK_WINDOW; i++) {
    const window = _mvcBuffer.slice(i, i + MVC_PEAK_WINDOW);
    const windowRMS = computeChannelRMS(window);
    const sum = windowRMS.reduce((a, b) => a + b, 0);
    if (sum > bestSum) {
      bestSum = sum;
      bestWindowRMS = windowRMS;
    }
  }
  const mvc =
    bestWindowRMS.length > 0
      ? bestWindowRMS
      : computeChannelRMS(_mvcBuffer.slice(-MVC_PEAK_WINDOW));
  _phase = "idle";
  return mvc;
}

export function buildCoefficients(
  baseline: number[],
  mvc: number[],
): CalibrationCoefficients {
  const safeMVC = mvc.map((m, ch) => {
    const minMVC = baseline[ch] * MIN_MVC_BASELINE_RATIO;
    return Math.max(m, minMVC, 0.001);
  });
  return { baseline, mvc: safeMVC, calibratedAt: Date.now() };
}

export function normalize(
  liveRMS: number[],
  coeffs: CalibrationCoefficients,
): number[] {
  return liveRMS.slice(0, CHANNELS).map((rms, ch) => {
    const range = coeffs.mvc[ch] - coeffs.baseline[ch];
    if (range <= 0) return 0;
    const pct = ((rms - coeffs.baseline[ch]) / range) * 100;
    return Math.max(0, Math.min(150, pct));
  });
}

export function bilateralAsymmetry(leftPct: number, rightPct: number): number {
  const avg = (leftPct + rightPct) / 2;
  if (avg === 0) return 0;
  return (Math.abs(leftPct - rightPct) / avg) * 100;
}

function computeChannelRMS(frames: number[][]): number[] {
  const numFrames = frames.length;
  const result = new Array(CHANNELS).fill(0);
  for (const frame of frames) {
    for (let ch = 0; ch < CHANNELS; ch++) {
      const sample = frame[ch] ?? 0;
      result[ch] += sample * sample;
    }
  }

  for (let ch = 0; ch < CHANNELS; ch++) {
    result[ch] = Math.sqrt(result[ch] / numFrames);
  }

  return result;
}
