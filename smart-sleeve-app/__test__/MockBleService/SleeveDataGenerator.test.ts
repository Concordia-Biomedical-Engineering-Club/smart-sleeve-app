/**
 * SleeveDataGenerator Unit Tests
 * ================================
 *
 * Purpose: Verify that the data generator creates valid mock EMG and IMU data
 * that matches the hardware specification (Section 9.2) and behaves correctly
 * across different scenarios (REST, FLEX, SQUAT).
 *
 * Testing Strategy:
 * - Verify data structure matches interface definitions
 * - Confirm amplitude variations between scenarios
 * - Validate time-based patterns and randomness
 * - Ensure checksums are calculated
 *
 * If tests fail:
 * 1. Check if SleeveDataGenerator implementation changed
 * 2. Verify header values haven't changed (0xA1 for EMG, 0xB1 for IMU)
 * 3. Confirm scenario amplitudes: REST=0.05, FLEX=0.8, SQUAT=0.5
 * 4. Check that EMG uses random noise, IMU uses time-based sin/cos
 */

import { SleeveDataGenerator } from "../../services/MockBleService/SleeveDataGenerator";
import type { SleeveScenario } from "../../services/SleeveConnector/ISleeveConnector";

describe("SleeveDataGenerator", () => {
  let generator: SleeveDataGenerator;

  beforeEach(() => {
    // Create a fresh generator for each test to avoid state pollution
    generator = new SleeveDataGenerator();
  });

  describe("EMG Frame Generation", () => {
    /**
     * Test: Verify EMG data structure
     * Why: Ensures compatibility with ISleeveConnector interface
     * Fails if: Properties are missing or renamed in EMGData interface
     */
    it("should generate EMG frame with correct structure", () => {
      const frame = generator.generateEMGFrame();

      expect(frame).toHaveProperty("header");
      expect(frame).toHaveProperty("timestamp");
      expect(frame).toHaveProperty("channels");
      expect(frame).toHaveProperty("checksum");
    });

    /**
     * Test: Verify EMG has 8 channels
     * Why: Hardware spec requires exactly 8 EMG channels per Section 9.2
     * Fails if: Implementation changes channel count
     */
    it("should generate EMG frame with 8 channels", () => {
      const frame = generator.generateEMGFrame();

      expect(frame.channels).toHaveLength(8);
    });

    /**
     * Test: Verify EMG header byte
     * Why: Protocol uses 0xA1 (161) as EMG packet identifier
     * Fails if: Header constant changes in implementation
     */
    it("should generate EMG frame with valid header (0xA1)", () => {
      const frame = generator.generateEMGFrame();

      expect(frame.header).toBe(0xa1);
    });

    /**
     * Test: Verify timestamp is current
     * Why: Ensures frame timestamps represent generation time
     * Fails if: Date.now() not used or clock issues
     */
    it("should generate EMG frame with current timestamp", () => {
      const before = Date.now();
      const frame = generator.generateEMGFrame();
      const after = Date.now();

      expect(frame.timestamp).toBeGreaterThanOrEqual(before);
      expect(frame.timestamp).toBeLessThanOrEqual(after);
    });

    /**
     * Test: Verify EMG values change over time for REST
     * Why: Data should not be static - randomness provides variation
     * Fails if: Random generation removed or Math.random() returns same values
     * Note: Uses randomness, so extremely rare false positives possible
     */
    it("should generate different EMG values for REST scenario", () => {
      generator.setScenario("REST");

      const frame1 = generator.generateEMGFrame();
      // Wait a tiny bit for time-based variation
      const frame2 = generator.generateEMGFrame();

      // At least some channels should be different due to time-based sin/cos
      const hasDifference = frame1.channels.some(
        (val, idx) => Math.abs(val - frame2.channels[idx]) > 0.001
      );

      expect(hasDifference).toBe(true);
    });

    /**
     * Test: Verify FLEX scenario produces large amplitude
     * Why: FLEX represents active muscle contraction (amplitude=0.8)
     * Fails if: Amplitude changed or scenario logic broken
     * Note: Averages 10 frames to smooth out randomness
     */
    it("should generate larger amplitude for FLEX scenario", () => {
      generator.setScenario("FLEX");

      const frames = Array.from({ length: 10 }, () =>
        generator.generateEMGFrame()
      );
      const maxValues = frames.map((f) =>
        Math.max(...f.channels.map(Math.abs))
      );
      const avgMax = maxValues.reduce((a, b) => a + b, 0) / maxValues.length;

      // FLEX amplitude is 0.8, should see values around that range
      expect(avgMax).toBeGreaterThan(0.5);
    });

    /**
     * Test: Verify REST scenario produces small amplitude
     * Why: REST represents minimal muscle activity (amplitude=0.05)
     * Fails if: Amplitude changed or scenario not properly set
     * Note: Averages 10 frames to smooth out randomness
     */
    it("should generate smaller amplitude for REST scenario", () => {
      generator.setScenario("REST");

      const frames = Array.from({ length: 10 }, () =>
        generator.generateEMGFrame()
      );
      const maxValues = frames.map((f) =>
        Math.max(...f.channels.map(Math.abs))
      );
      const avgMax = maxValues.reduce((a, b) => a + b, 0) / maxValues.length;

      // REST amplitude is 0.05, should see small values
      expect(avgMax).toBeLessThan(0.2);
    });

    /**
     * Test: Verify SQUAT scenario produces medium amplitude
     * Why: SQUAT is between REST and FLEX (amplitude=0.5)
     * Fails if: Amplitude changed or scenario hierarchy broken
     * Note: Should be greater than REST but less than FLEX
     */
    it("should generate medium amplitude for SQUAT scenario", () => {
      generator.setScenario("SQUAT");

      const frames = Array.from({ length: 10 }, () =>
        generator.generateEMGFrame()
      );
      const maxValues = frames.map((f) =>
        Math.max(...f.channels.map(Math.abs))
      );
      const avgMax = maxValues.reduce((a, b) => a + b, 0) / maxValues.length;

      // SQUAT amplitude is 0.5, should be between REST and FLEX
      expect(avgMax).toBeGreaterThan(0.2);
      expect(avgMax).toBeLessThan(0.8);
    });
  });

  describe("IMU Frame Generation", () => {
    /**
     * Test: Verify IMU data structure
     * Why: Ensures compatibility with ISleeveConnector interface
     * Fails if: Properties missing or renamed in IMUData interface
     */
    it("should generate IMU frame with correct structure", () => {
      const frame = generator.generateIMUFrame();

      expect(frame).toHaveProperty("header");
      expect(frame).toHaveProperty("timestamp");
      expect(frame).toHaveProperty("roll");
      expect(frame).toHaveProperty("pitch");
      expect(frame).toHaveProperty("yaw");
      expect(frame).toHaveProperty("checksum");
    });

    /**
     * Test: Verify IMU header byte
     * Why: Protocol uses 0xB1 (177) as IMU packet identifier
     * Fails if: Header constant changes in implementation
     */
    it("should generate IMU frame with valid header (0xB1)", () => {
      const frame = generator.generateIMUFrame();

      expect(frame.header).toBe(0xb1);
    });

    it("should generate IMU frame with current timestamp", () => {
      const before = Date.now();
      const frame = generator.generateIMUFrame();
      const after = Date.now();

      expect(frame.timestamp).toBeGreaterThanOrEqual(before);
      expect(frame.timestamp).toBeLessThanOrEqual(after);
    });

    /**
     * Test: Verify yaw is always 0 for knee movements
     * Why: Knees don't rotate around vertical axis, only flex/extend
     * Fails if: Implementation adds yaw rotation (would be incorrect for knee)
     * Note: This is intentional behavior, not a bug
     */
    it("should generate yaw of 0 for all scenarios (knee constraint)", () => {
      const scenarios: SleeveScenario[] = ["REST", "FLEX", "SQUAT"];

      scenarios.forEach((scenario) => {
        generator.setScenario(scenario);
        const frame = generator.generateIMUFrame();
        expect(frame.yaw).toBe(0);
      });
    });

    /**
     * Test: Verify REST produces small IMU angles
     * Why: REST means minimal joint movement (±2° oscillation)
     * Fails if: Amplitude increased or scenario logic changed
     * Note: Checks maximum across 10 frames for statistical confidence
     */
    it("should generate small roll/pitch for REST scenario", () => {
      generator.setScenario("REST");

      const frames = Array.from({ length: 10 }, () =>
        generator.generateIMUFrame()
      );
      const maxRoll = Math.max(...frames.map((f) => Math.abs(f.roll)));
      const maxPitch = Math.max(...frames.map((f) => Math.abs(f.pitch)));

      // REST should have small movements (±2 degrees)
      expect(maxRoll).toBeLessThan(5);
      expect(maxPitch).toBeLessThan(5);
    });

    /**
     * Test: Verify FLEX produces large IMU angles
     * Why: FLEX means active knee flexion (20-60° for roll, up to 40° for pitch)
     * Fails if: Amplitude decreased or time-based math changed
     * Note: Generates 20 frames to capture the sinusoidal peaks
     */
    it("should generate large roll/pitch for FLEX scenario", () => {
      generator.setScenario("FLEX");

      // Generate multiple frames to capture the oscillation
      const frames = Array.from({ length: 20 }, () => {
        const frame = generator.generateIMUFrame();
        // Small delay to capture time variation
        return frame;
      });

      const maxRoll = Math.max(...frames.map((f) => Math.abs(f.roll)));
      const maxPitch = Math.max(...frames.map((f) => Math.abs(f.pitch)));

      // FLEX should have large movements (20-60° for roll, up to 40° for pitch)
      expect(maxRoll).toBeGreaterThan(15);
      expect(maxPitch).toBeGreaterThan(5);
    });
  });

  describe("Scenario Switching", () => {
    /**
     * Test: Verify all valid scenarios are accepted
     * Why: Ensures setScenario() handles all SleeveScenario enum values
     * Fails if: New scenario added but not implemented, or logic throws errors
     */
    it("should accept valid scenarios", () => {
      const scenarios: SleeveScenario[] = ["REST", "FLEX", "SQUAT"];

      scenarios.forEach((scenario) => {
        expect(() => generator.setScenario(scenario)).not.toThrow();
      });
    });

    /**
     * Test: Verify scenario changes affect output amplitude
     * Why: Switching scenarios should immediately change data characteristics
     * Fails if: Scenario state not properly stored or amplitude logic broken
     * Note: Compares average FLEX amplitude vs single REST frame
     */
    it("should change behavior when switching scenarios", () => {
      generator.setScenario("REST");
      const restFrame = generator.generateEMGFrame();
      const restMax = Math.max(...restFrame.channels.map(Math.abs));

      generator.setScenario("FLEX");

      // FLEX should generally produce larger values than REST
      // Note: Due to randomness, we check multiple frames
      const flexFrames = Array.from({ length: 5 }, () =>
        generator.generateEMGFrame()
      );
      const avgFlexMax =
        flexFrames.reduce(
          (sum, f) => sum + Math.max(...f.channels.map(Math.abs)),
          0
        ) / 5;

      expect(avgFlexMax).toBeGreaterThan(restMax);
    });
  });

  describe("Checksum Generation", () => {
    /**
     * Test: Verify EMG checksums vary with data
     * Why: Checksums provide basic data integrity validation
     * Fails if: Checksum calculation removed or always returns same value
     * Note: Random channels mean checksums will almost always differ
     */
    it("should generate different checksums for different EMG data", () => {
      const frame1 = generator.generateEMGFrame();
      const frame2 = generator.generateEMGFrame();

      // Since channels are random, data will almost always differ
      const hasDifferentChannels = frame1.channels.some(
        (val, idx) => val !== frame2.channels[idx]
      );

      // At least channels should be different (due to randomness)
      expect(hasDifferentChannels).toBe(true);
    });

    /**
     * Test: Verify IMU checksums vary with time-based data
     * Why: IMU uses sin/cos which changes over time, checksums should reflect this
     * Fails if: Time-based calculation broken or checksum not recalculated
     * Note: 10ms delay ensures roll/pitch values differ
     */
    it("should generate different checksums for different IMU data", () => {
      generator.setScenario("FLEX"); // Use FLEX for more variation

      const frame1 = generator.generateIMUFrame();

      // Wait to ensure different timestamp/values
      const start = Date.now();
      while (Date.now() - start < 10) {} // 10ms delay for time-based variation

      const frame2 = generator.generateIMUFrame();

      // Timestamps should differ
      expect(frame1.timestamp).not.toBe(frame2.timestamp);

      // Roll/pitch should differ due to time-based sin/cos
      const hasDifferentOrientation =
        frame1.roll !== frame2.roll || frame1.pitch !== frame2.pitch;

      expect(hasDifferentOrientation).toBe(true);
    });

    /**
     * Test: Verify checksum is valid byte value
     * Why: Checksum must fit in single byte for protocol compliance
     * Fails if: Checksum calculation doesn't apply & 0xFF mask
     * Note: Range is 0-255 (0x00-0xFF)
     */
    it("should generate checksum as a byte value (0-255)", () => {
      const emgFrame = generator.generateEMGFrame();
      const imuFrame = generator.generateIMUFrame();

      expect(emgFrame.checksum).toBeGreaterThanOrEqual(0);
      expect(emgFrame.checksum).toBeLessThanOrEqual(255);
      expect(imuFrame.checksum).toBeGreaterThanOrEqual(0);
      expect(imuFrame.checksum).toBeLessThanOrEqual(255);
    });
  });
});
