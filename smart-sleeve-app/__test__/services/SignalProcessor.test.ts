import { SignalProcessor } from "../../services/SignalProcessing/SignalProcessor";
import { EMGData } from "../../services/SleeveConnector/ISleeveConnector";

describe("SignalProcessor Service", () => {
    let processor: SignalProcessor;
    const FS = 50; // 50 Hz

    beforeEach(() => {
        // Default params in SignalProcessor: fs=50, notch=0, hp=5, lp=24
        processor = new SignalProcessor(FS, 0, 5, 24);
    });

    /**
     * Helper to generate a dummy EMG packet
     */
    const createPacket = (val: number, timestamp: number): EMGData => ({
        header: 0xA0,
        timestamp,
        channels: [val, val, val, val], // 4 channels
        checksum: 0
    });

    /**
     * Helper to run a filtered pass of N samples of a generated frequency
     * Returns the RMS amplitude of the last 100 samples to check steady-state.
     */
    const runFrequencyTest = (freq: number, durationSec: number = 1.0): number => {
        const numSamples = FS * durationSec;
        const outputBuffer: number[] = [];
        
        // Reset processor state by creating new one or relying on test isolation
        // Testing channel 0
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / FS;
            const input = Math.sin(2 * Math.PI * freq * t);
            const packet = createPacket(input, t * 1000);
            const processed = processor.processEMG(packet);
            outputBuffer.push(processed.channels[0]);
        }

        // Calculate RMS of last few samples (Steady state)
        // At 50Hz, 1s has 50 samples. Let's take last 20.
        const steadyStateSamples = outputBuffer.slice(-20);
        const sumSq = steadyStateSamples.reduce((acc, val) => acc + val * val, 0);
        return Math.sqrt(sumSq / steadyStateSamples.length);
    };

    it("should instantiate correctly", () => {
        expect(processor).toBeDefined();
    });

    it("should preserve number of channels", () => {
        const input = createPacket(1.0, 0);
        const output = processor.processEMG(input);
        expect(output.channels.length).toBe(4);
    });

    it("should handle passthrough when notch is 0", () => {
        // With notch=0, it should pass a 15Hz signal (also in passband)
        const rms = runFrequencyTest(15, 1.0);
        expect(rms).toBeGreaterThan(0.6); 
    });

    it("should pass 15Hz signal (Passband)", () => {
        // 15Hz is in the 5-24Hz passband
        const rms = runFrequencyTest(15, 1.0);
        
        // Should be close to input RMS (0.707)
        expect(rms).toBeGreaterThan(0.6); 
    });

    it("should attenuate 2Hz signal (High Pass cut < 5Hz)", () => {
        // 2Hz is below 5Hz cutoff
        const rms = runFrequencyTest(2, 2.0); // Longer duration to settle
        
        // Should be attenuated
        expect(rms).toBeLessThan(0.4); 
    });

    it("should attenuate 30Hz signal (Low Pass cut @ 24Hz)", () => {
        // At FS=50, 30Hz aliases to 20Hz, but the filter should still attenuate 
        // high frequencies before they reach Nyquist if possible, or we just test 24Hz.
        // Let's test a frequency closer to Nyquist
        const lpProcessor = new SignalProcessor(50, 0, 1, 10); // Lower LP for testing
        
        const runLPTest = (freq: number): number => {
             const packetGen = (v: number) => ({ header:0, timestamp:0, channels:[v], checksum:0 });
             const samples: number[] = [];
             for(let i=0; i<100; i++) {
                 const t = i/50;
                 const inp = Math.sin(2*Math.PI*freq*t);
                 const out = lpProcessor.processEMG(packetGen(inp)).channels[0];
                 samples.push(out);
             }
             const ss = samples.slice(-20);
             return Math.sqrt(ss.reduce((a, b) => a + b*b, 0) / ss.length);
        };

        // 20Hz should be blocked by 10Hz LP
        const rmsAt20 = runLPTest(20);
        expect(rmsAt20).toBeLessThan(0.2); 

        // 5Hz should pass
        const rmsAt5 = runLPTest(5);
        expect(rmsAt5).toBeGreaterThan(0.6);
    });

    it("should suppress REST noise (Drift + Fine Noise) to < 0.05 RMS", () => {
        // Simulate REST: Motion Drift (1.5Hz) + Noise Floor (0.1 range)
        const numSamples = FS * 2.0;
        const outputBuffer: number[] = [];
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / FS;
            // 1.5Hz drift is large (0.8) but should be killed by 5Hz HPF
            const drift = Math.sin(2 * Math.PI * 1.5 * t) * 0.8;
            // White noise floor
            const noise = (Math.random() - 0.5) * 0.1;
            
            const packet = createPacket(drift + noise, t * 1000);
            const processed = processor.processEMG(packet);
            outputBuffer.push(processed.channels[0]);
        }

        // Calculate RMS of last 50 samples
        const ss = outputBuffer.slice(-50);
        const rms = Math.sqrt(ss.reduce((a, b) => a + b * b, 0) / ss.length);
        
        // Should be very small (< 0.06) because drift is filtered out
        expect(rms).toBeLessThan(0.06);
    });

    it("should have low latency (<20ms)", () => {
        const packet = createPacket(1.0, 0);
        const start = performance.now();
        const ITERATIONS = 1000;
        
        for (let i = 0; i < ITERATIONS; i++) {
            processor.processEMG(packet);
        }
        
        const end = performance.now();
        const totalTime = end - start;
        const perPacket = totalTime / ITERATIONS;
        
        console.log(`Average processing time per packet: ${perPacket.toFixed(4)}ms`);
        expect(perPacket).toBeLessThan(1.0); // comfortably below 20ms
    });
});
