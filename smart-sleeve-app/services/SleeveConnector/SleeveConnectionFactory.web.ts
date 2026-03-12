/**
 * SleeveConnectionFactory.web.ts
 * -----------------------------------------------------
 * Web-specific connector factory.
 * BLE hardware is native-only, so web always uses the
 * mock connector regardless of env configuration.
 * -----------------------------------------------------
 */

import { ISleeveConnector } from "./ISleeveConnector";
import { MockSleeveConnector } from "../MockBleService/MockSleeveConnector";

export class SleeveConnectionFactory {
  private static instance: ISleeveConnector | null = null;

  public static getConnector(): ISleeveConnector {
    if (!this.instance) {
      console.log(
        "[SleeveConnectionFactory] Web platform detected, using MockSleeveConnector",
      );
      this.instance = new MockSleeveConnector();
    }

    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = null;
  }
}

SleeveConnectionFactory.resetInstance();
