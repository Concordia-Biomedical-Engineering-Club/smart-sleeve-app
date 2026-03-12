/**
 * SleeveConnectionFactory.ts
 * -----------------------------------------------------
 * Singleton factory that handles the instantiation of
 * the appropriate ISleeveConnector (Mock vs Real).
 * -----------------------------------------------------
 */

import { NativeModules } from "react-native";
import { ISleeveConnector } from "./ISleeveConnector";
import { MockSleeveConnector } from "../MockBleService/MockSleeveConnector";
import { RealSleeveConnector } from "./RealSleeveConnector";

const USE_MOCK_HARDWARE_ENV_KEY = [
  "EXPO",
  "PUBLIC",
  "USE",
  "MOCK",
  "HARDWARE",
].join("_");

export class SleeveConnectionFactory {
  private static instance: ISleeveConnector | null = null;

  /**
   * Returns a singleton instance of the appropriate sleeve connector.
   * Logic is based on EXPO_PUBLIC_USE_MOCK_HARDWARE env variable.
   */
  public static getConnector(): ISleeveConnector {
    if (!this.instance) {
      const useMock = process.env[USE_MOCK_HARDWARE_ENV_KEY] !== "false";

      if (useMock) {
        console.log(
          "[SleeveConnectionFactory] Initializing MockSleeveConnector",
        );
        this.instance = new MockSleeveConnector();
      } else if (!this.isBleNativeModuleAvailable()) {
        console.warn(
          "[SleeveConnectionFactory] BlePlx native module unavailable, falling back to MockSleeveConnector. Use a rebuilt native dev client for real BLE.",
        );
        this.instance = new MockSleeveConnector();
      } else {
        console.log(
          "[SleeveConnectionFactory] Initializing RealSleeveConnector",
        );
        this.instance = new RealSleeveConnector();
      }
    }
    return this.instance!;
  }

  /**
   * Destroys the current singleton so the next getConnector() call
   * creates a fresh instance. Use in tests or after a full Fast Refresh.
   */
  public static resetInstance(): void {
    this.instance = null;
  }

  private static isBleNativeModuleAvailable(): boolean {
    return NativeModules.BlePlx != null;
  }
}

// Invalidate the singleton on every module re-evaluation.
// On web, Fast Refresh re-runs this module → instance gets cleared automatically.
// On iOS/Hermes, full reload (press 'r') is still required for module-level code to re-run.
SleeveConnectionFactory.resetInstance();
