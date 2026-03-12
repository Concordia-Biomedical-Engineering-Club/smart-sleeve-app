/**
 * SleeveConnectionFactory.ts
 * -----------------------------------------------------
 * Singleton factory that handles the instantiation of
 * the appropriate ISleeveConnector (Mock vs Real).
 * -----------------------------------------------------
 */

import { ISleeveConnector } from './ISleeveConnector';
import { MockSleeveConnector } from '../MockBleService/MockSleeveConnector';
import { RealSleeveConnector } from './RealSleeveConnector';

export class SleeveConnectionFactory {
  private static instance: ISleeveConnector | null = null;

  /**
   * Returns a singleton instance of the appropriate sleeve connector.
   * Logic is based on EXPO_PUBLIC_USE_MOCK_HARDWARE env variable.
   */
  public static getConnector(): ISleeveConnector {
    if (!this.instance) {
      // Default to Mock if env is unset or 'false'
      const useMock = process.env.EXPO_PUBLIC_USE_MOCK_HARDWARE !== 'false';
      
      if (useMock) {
        console.log('[SleeveConnectionFactory] Initializing MockSleeveConnector');
        this.instance = new MockSleeveConnector();
      } else {
        console.log('[SleeveConnectionFactory] Initializing RealSleeveConnector');
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
}

// Invalidate the singleton on every module re-evaluation.
// On web, Fast Refresh re-runs this module → instance gets cleared automatically.
// On iOS/Hermes, full reload (press 'r') is still required for module-level code to re-run.
SleeveConnectionFactory.resetInstance();
