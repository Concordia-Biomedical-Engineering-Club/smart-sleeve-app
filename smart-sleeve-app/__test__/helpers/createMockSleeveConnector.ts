import type { ISleeveConnector } from "@/services/SleeveConnector/ISleeveConnector";

export function createMockSleeveConnector(): jest.Mocked<ISleeveConnector> {
  return {
    scan: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribeToEMG: jest.fn(),
    subscribeToIMU: jest.fn(),
    onConnectionStatusChange: jest.fn(),
    onTransportEvent: jest.fn(),
    setScenario: jest.fn(),
  };
}
