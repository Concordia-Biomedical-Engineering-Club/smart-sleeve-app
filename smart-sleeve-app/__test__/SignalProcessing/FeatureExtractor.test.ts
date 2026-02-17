import { FeatureExtractor } from '../../services/SignalProcessing/FeatureExtractor';

describe('FeatureExtractor', () => {
  const numChannels = 8;
  
  test('RMS of constant 1s should be 1', () => {
    const samples = Array(10).fill(Array(numChannels).fill(1));
    const rms = FeatureExtractor.calculateRMS(samples);
    expect(rms).toEqual(Array(numChannels).fill(1));
  });

  test('RMS of zeros should be 0', () => {
    const samples = Array(10).fill(Array(numChannels).fill(0));
    const rms = FeatureExtractor.calculateRMS(samples);
    expect(rms).toEqual(Array(numChannels).fill(0));
  });

  test('MAV of constant -1s should be 1', () => {
    const samples = Array(10).fill(Array(numChannels).fill(-1));
    const mav = FeatureExtractor.calculateMAV(samples);
    expect(mav).toEqual(Array(numChannels).fill(1));
  });

  test('RMS of a simple alternating wave (square-like)', () => {
    // [1, -1, 1, -1 ...] -> sumSquares = 10, mean = 1, sqrt = 1
    const samples = Array(10).fill(0).map((_, i) => 
        Array(numChannels).fill(i % 2 === 0 ? 1 : -1)
    );
    const rms = FeatureExtractor.calculateRMS(samples);
    expect(rms).toEqual(Array(numChannels).fill(1));
  });

  test('RMS of a sine wave should be approx 0.707', () => {
    const numSamples = 100; // Use more samples for better approx
    const frequency = 1;
    const samplingRate = 20; 
    
    // Generate sine wave: sin(2 * pi * f * t)
    const samples = Array(numSamples).fill(0).map((_, i) => {
        const t = i / samplingRate;
        const val = Math.sin(2 * Math.PI * frequency * t);
        return Array(numChannels).fill(val);
    });

    const rms = FeatureExtractor.calculateRMS(samples);
    
    // RMS of sine wave with amplitude 1 is 1/sqrt(2) ≈ 0.7071
    const expected = 1 / Math.sqrt(2);
    
    rms.forEach(val => {
        expect(val).toBeCloseTo(expected, 1); // Check to 1 decimal place due to resolution
    });
  });
});
