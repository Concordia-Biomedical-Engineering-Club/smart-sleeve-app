import { SleeveConnectionFactory } from "@/services/SleeveConnector/SleeveConnectionFactory";
import { ISleeveConnector } from "@/services/SleeveConnector/ISleeveConnector";
import { useMemo } from "react";

/**
 * Hook to get the active sleeve connector.
 * This abstracts away the factory logic from components.
 */
export function useSleeve(): ISleeveConnector {
  // We use useMemo to ensure we don't call getConnector on every render,
  // although it returns a singleton anyway.
  const connector = useMemo(() => SleeveConnectionFactory.getConnector(), []);
  return connector;
}
