/**
 * MockSleeveConnector Unit Tests
 * ================================
 *
 * Purpose: Verify the mock BLE connector properly simulates real-time
 * data streaming at 50Hz, manages connection lifecycle, and supports
 * multiple subscribers (observer pattern).
 *
 * Testing Strategy:
 * - Use fake timers to control setInterval without waiting real time
 * - Verify 50Hz streaming rate (20ms intervals = 50 frames/second)
 * - Test connection/disconnection state management
 * - Validate subscriber callbacks fire correctly
 * - Ensure data stops when disconnected
 *
 * Fake Timers:
 * - jest.useFakeTimers() mocks setInterval/setTimeout
 * - jest.advanceTimersByTime(100) simulates 100ms passing instantly
 * - 100ms at 50Hz = 5 frames (100ms / 20ms = 5)
 * - scan() uses real setTimeout, so we switch to real timers for those tests
 *
 * If tests fail:
 * 1. Check if interval timing changed from 20ms (50Hz requirement)
 * 2. Verify setInterval is cleared on disconnect
 * 3. Confirm callbacks are being invoked correctly
 * 4. Check ConnectionStatus interface hasn't changed
 */

import { MockSleeveConnector } from "../../services/MockBleService/MockSleeveConnector";
import type {
  EMGData,
  IMUData,
  ConnectionStatus,
} from "../../services/MockBleService/ISleeveConnector";

// Mock timers for controlling setInterval without waiting real time
jest.useFakeTimers();

describe("MockSleeveConnector", () => {
  let connector: MockSleeveConnector;

  beforeEach(() => {
    // Create fresh connector and clear any pending timers
    connector = new MockSleeveConnector();
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Clean up to prevent timer leaks between tests
    connector.disconnect();
  });

  describe("Connection Lifecycle", () => {
    /**
     * Test: Verify initial disconnected state
     * Why: Connector should not emit status until connection attempt
     * Fails if: Constructor triggers automatic connection status
     */
    it("should start disconnected", () => {
      let status: ConnectionStatus | null = null;

      connector.onConnectionStatusChange((s) => {
        status = s;
      });

      expect(status).toBeNull(); // No status change yet
    });

    /**
     * Test: Verify connection emits status update
     * Why: UI needs to know when connection succeeds
     * Fails if: onConnectionStatusChange not called or status wrong
     * Note: Status should include connected=true, deviceId, and timestamp
     */
    it("should connect successfully", async () => {
      const statuses: ConnectionStatus[] = [];

      connector.onConnectionStatusChange((status) => {
        statuses.push(status);
      });

      await connector.connect("test-device-123");

      expect(statuses).toHaveLength(1);
      expect(statuses[0].connected).toBe(true);
      expect(statuses[0].deviceId).toBe("test-device-123");
      expect(statuses[0].lastUpdated).toBeDefined();
    });

    /**
     * Test: Verify disconnect emits status update
     * Why: UI needs to know when connection is terminated
     * Fails if: Disconnect doesn't trigger status callback or flag wrong
     * Note: Should emit TWO statuses: connect (true) then disconnect (false)
     */
    it("should disconnect successfully", async () => {
      const statuses: ConnectionStatus[] = [];

      connector.onConnectionStatusChange((status) => {
        statuses.push(status);
      });

      await connector.connect("test-device");
      connector.disconnect();

      expect(statuses).toHaveLength(2);
      expect(statuses[0].connected).toBe(true);
      expect(statuses[1].connected).toBe(false);
    });

    it("should emit connection status with timestamp", async () => {
      let status: ConnectionStatus | null = null;

      connector.onConnectionStatusChange((s) => {
        status = s;
      });

      const before = Date.now();
      await connector.connect("test-device");
      const after = Date.now();

      expect(status).not.toBeNull();
      expect(status!.lastUpdated).toBeDefined();
      expect(status!.lastUpdated!).toBeGreaterThanOrEqual(before);
      expect(status!.lastUpdated!).toBeLessThanOrEqual(after);
    });
  });

  describe("Data Streaming", () => {
    /**
     * Test: Verify EMG streaming at 50Hz
     * Why: Hardware spec requires 50Hz (20ms interval)
     * Fails if: setInterval timing changed or EMG callback not fired
     * Note: 100ms / 20ms = 5 frames. Using fake timers for instant execution.
     */
    it("should emit EMG data after connection at 50Hz", async () => {
      const emgData: EMGData[] = [];

      connector.subscribeToEMG((data) => {
        emgData.push(data);
      });

      await connector.connect("test-device");

      // Advance timers by 100ms (should get 5 frames at 50Hz)
      jest.advanceTimersByTime(100);

      expect(emgData.length).toBe(5);
    });

    /**
     * Test: Verify IMU streaming at 50Hz
     * Why: IMU and EMG must stream at same rate
     * Fails if: IMU callbacks not fired or timing different from EMG
     * Note: Same 50Hz calculation as EMG test
     */
    it("should emit IMU data after connection at 50Hz", async () => {
      const imuData: IMUData[] = [];

      connector.subscribeToIMU((data) => {
        imuData.push(data);
      });

      await connector.connect("test-device");

      // Advance timers by 100ms (should get 5 frames at 50Hz)
      jest.advanceTimersByTime(100);

      expect(imuData.length).toBe(5);
    });

    /**
     * Test: Verify EMG and IMU emit synchronously
     * Why: Both data types should be generated together each interval
     * Fails if: Separate timers used or one callback not firing
     * Note: After 200ms, both should have exactly 10 frames
     */
    it("should emit EMG and IMU data synchronously", async () => {
      const emgData: EMGData[] = [];
      const imuData: IMUData[] = [];

      connector.subscribeToEMG((data) => emgData.push(data));
      connector.subscribeToIMU((data) => imuData.push(data));

      await connector.connect("test-device");

      jest.advanceTimersByTime(200); // 200ms = 10 frames

      expect(emgData.length).toBe(10);
      expect(imuData.length).toBe(10);
    });

    /**
     * Test: Verify data stops after disconnect
     * Why: Memory leak prevention - timers must be cleared
     * Fails if: clearInterval not called or timer reference lost
     * Note: Count before disconnect, then verify no new frames after
     */
    it("should stop emitting data after disconnect", async () => {
      const emgData: EMGData[] = [];

      connector.subscribeToEMG((data) => {
        emgData.push(data);
      });

      await connector.connect("test-device");
      jest.advanceTimersByTime(100); // Get 5 frames

      const countBeforeDisconnect = emgData.length;
      connector.disconnect();

      jest.advanceTimersByTime(100); // Should not get more frames

      expect(emgData.length).toBe(countBeforeDisconnect);
    });

    /**
     * Test: Verify no data emitted before connection
     * Why: Should not start streaming until explicitly connected
     * Fails if: setInterval started in constructor instead of connect()
     */
    it("should not emit data before connection", () => {
      const emgData: EMGData[] = [];

      connector.subscribeToEMG((data) => {
        emgData.push(data);
      });

      jest.advanceTimersByTime(100);

      expect(emgData.length).toBe(0);
    });
  });

  describe("Multiple Subscribers", () => {
    /**
     * Test: Verify multiple EMG subscribers receive same data
     * Why: Observer pattern must support multiple UI components
     * Fails if: Callbacks not stored in array or iteration broken
     * Note: Both subscribers should get identical frames
     */
    it("should support multiple EMG subscribers", async () => {
      const emgData1: EMGData[] = [];
      const emgData2: EMGData[] = [];

      connector.subscribeToEMG((data) => emgData1.push(data));
      connector.subscribeToEMG((data) => emgData2.push(data));

      await connector.connect("test-device");
      jest.advanceTimersByTime(100);

      expect(emgData1.length).toBe(5);
      expect(emgData2.length).toBe(5);

      // Both should receive the same data
      expect(emgData1[0]).toEqual(emgData2[0]);
    });

    /**
     * Test: Verify multiple IMU subscribers receive same data
     * Why: Same observer pattern requirements as EMG
     * Fails if: IMU callbacks handled differently than EMG
     */
    it("should support multiple IMU subscribers", async () => {
      const imuData1: IMUData[] = [];
      const imuData2: IMUData[] = [];

      connector.subscribeToIMU((data) => imuData1.push(data));
      connector.subscribeToIMU((data) => imuData2.push(data));

      await connector.connect("test-device");
      jest.advanceTimersByTime(100);

      expect(imuData1.length).toBe(5);
      expect(imuData2.length).toBe(5);

      // Both should receive the same data
      expect(imuData1[0]).toEqual(imuData2[0]);
    });

    /**
     * Test: Verify multiple connection status subscribers
     * Why: Multiple components may need to react to connection state
     * Fails if: Status callbacks not properly managed
     */
    it("should support multiple connection status subscribers", async () => {
      const statuses1: ConnectionStatus[] = [];
      const statuses2: ConnectionStatus[] = [];

      connector.onConnectionStatusChange((s) => statuses1.push(s));
      connector.onConnectionStatusChange((s) => statuses2.push(s));

      await connector.connect("test-device");

      expect(statuses1.length).toBe(1);
      expect(statuses2.length).toBe(1);
      expect(statuses1[0]).toEqual(statuses2[0]);
    });
  });

  describe("Scenario Switching", () => {
    /**
     * Test: Verify scenario changes affect data patterns
     * Why: setScenario() should immediately change amplitude/behavior
     * Fails if: Scenario not passed to data generator or not applied
     * Note: Compares amplitude before/after scenario switch
     */
    it("should change data patterns when scenario changes", async () => {
      const emgData: EMGData[] = [];

      connector.subscribeToEMG((data) => emgData.push(data));

      await connector.connect("test-device");

      // Get some REST data
      jest.advanceTimersByTime(40); // 2 frames
      const restData = [...emgData];

      // Switch to FLEX
      connector.setScenario("FLEX");
      emgData.length = 0; // Clear array

      jest.advanceTimersByTime(40); // 2 more frames
      const flexData = [...emgData];

      // FLEX should have larger amplitude than REST
      const restMax = Math.max(
        ...restData.flatMap((d) => d.channels.map(Math.abs))
      );
      const flexMax = Math.max(
        ...flexData.flatMap((d) => d.channels.map(Math.abs))
      );

      expect(flexMax).toBeGreaterThan(restMax);
    });

    it("should accept all valid scenarios", async () => {
      await connector.connect("test-device");

      expect(() => connector.setScenario("REST")).not.toThrow();
      expect(() => connector.setScenario("FLEX")).not.toThrow();
      expect(() => connector.setScenario("SQUAT")).not.toThrow();
    });
  });

  describe("Scan Functionality", () => {
    /**
     * Test: Verify scan returns device list
     * Why: UI needs to show available devices before connecting
     * Fails if: scan() doesn't return array or promise doesn't resolve
     * Note: Uses real timers because scan() has actual setTimeout delay
     */
    it("should return mock device list", async () => {
      // scan() uses a real setTimeout, so we need to use real timers for this test
      jest.useRealTimers();

      const devices = await connector.scan();

      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);

      // Restore fake timers
      jest.useFakeTimers();
    });

    /**
     * Test: Verify scan returns same devices each time
     * Why: Mock should provide predictable device list
     * Fails if: Random device generation added (not desired for mock)
     */
    it("should return consistent device IDs", async () => {
      // scan() uses a real setTimeout
      jest.useRealTimers();

      const devices1 = await connector.scan();
      const devices2 = await connector.scan();

      expect(devices1).toEqual(devices2);

      // Restore fake timers
      jest.useFakeTimers();
    });
  });

  describe("Data Integrity", () => {
    /**
     * Test: Verify EMG data matches interface structure
     * Why: TypeScript interface compliance at runtime
     * Fails if: Data generator returns wrong structure
     * Note: Checks all required properties exist
     */
    it("should emit valid EMG data structure", async () => {
      let emgData: EMGData | null = null;

      connector.subscribeToEMG((data) => {
        if (!emgData) emgData = data;
      });

      await connector.connect("test-device");
      jest.advanceTimersByTime(20);

      expect(emgData).not.toBeNull();
      expect(emgData!.header).toBeDefined();
      expect(emgData!.timestamp).toBeDefined();
      expect(emgData!.channels).toHaveLength(8);
      expect(emgData!.checksum).toBeDefined();
    });

    /**
     * Test: Verify IMU data matches interface structure
     * Why: TypeScript interface compliance at runtime
     * Fails if: Data generator returns wrong structure
     * Note: Checks all required properties including roll/pitch/yaw
     */
    it("should emit valid IMU data structure", async () => {
      let imuData: IMUData | null = null;

      connector.subscribeToIMU((data) => {
        if (!imuData) imuData = data;
      });

      await connector.connect("test-device");
      jest.advanceTimersByTime(20);

      expect(imuData).not.toBeNull();
      expect(imuData!.header).toBeDefined();
      expect(imuData!.timestamp).toBeDefined();
      expect(imuData!.roll).toBeDefined();
      expect(imuData!.pitch).toBeDefined();
      expect(imuData!.yaw).toBeDefined();
      expect(imuData!.checksum).toBeDefined();
    });

    /**
     * Test: Verify timestamps are monotonically increasing
     * Why: Timestamps must advance for time-series analysis
     * Fails if: Date.now() not called per frame or cached incorrectly
     * Note: Each frame should have timestamp >= previous frame
     */
    it("should emit timestamps that increase over time", async () => {
      const emgData: EMGData[] = [];

      connector.subscribeToEMG((data) => emgData.push(data));

      await connector.connect("test-device");
      jest.advanceTimersByTime(60); // 3 frames

      expect(emgData.length).toBe(3);
      expect(emgData[1].timestamp).toBeGreaterThanOrEqual(emgData[0].timestamp);
      expect(emgData[2].timestamp).toBeGreaterThanOrEqual(emgData[1].timestamp);
    });
  });

  describe("Error Handling", () => {
    /**
     * Test: Verify disconnect works even if never connected
     * Why: Defensive programming - should not throw on disconnect()
     * Fails if: Disconnect assumes connection exists
     */
    it("should handle disconnect before connect", () => {
      expect(() => connector.disconnect()).not.toThrow();
    });

    /**
     * Test: Verify can reconnect to different device
     * Why: User may switch devices without destroying connector
     * Fails if: Previous timer not cleared before new connection
     */
    it("should handle multiple connects", async () => {
      await connector.connect("device-1");
      await expect(connector.connect("device-2")).resolves.not.toThrow();
    });

    /**
     * Test: Verify multiple disconnect calls are safe
     * Why: UI may call disconnect multiple times (cleanup, navigation, etc.)
     * Fails if: clearInterval called on undefined or throws error
     */
    it("should handle multiple disconnects", async () => {
      await connector.connect("test-device");

      expect(() => {
        connector.disconnect();
        connector.disconnect();
      }).not.toThrow();
    });
  });
});
