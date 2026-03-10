import { ISleeveConnector } from "@/services/SleeveConnector/ISleeveConnector";
import { useAppDispatch } from "./storeHooks";
import { useEffect, useMemo, useRef } from "react";
import {
  connectionChanged,
  emgFrameReceived,
  featuresUpdated,
  imuFrameReceived,
} from "@/store/deviceSlice";
import { SignalProcessor } from "@/services/SignalProcessing/SignalProcessor";
import { FeatureExtractor } from "@/services/SignalProcessing/FeatureExtractor";

import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

const WINDOW_SIZE = 10; // 200ms at 50Hz

export function useSleeveDevice(connector: ISleeveConnector) {
  const dispatch = useAppDispatch();
  const isFilteringEnabled = useSelector(
    (state: RootState) => state.device.isFilteringEnabled,
  );
  const isFilteringEnabledRef = useRef(isFilteringEnabled);
  const scenario = useSelector((state: RootState) => state.device.scenario);

  // Update ref when state changes
  useEffect(() => {
    isFilteringEnabledRef.current = isFilteringEnabled;
  }, [isFilteringEnabled]);

  // Memoize SignalProcessor to maintain filter state across re-renders
  const processor = useMemo(() => new SignalProcessor(), []);

  // Rolling buffer for feature extraction
  const rollingBuffer = useRef<number[][]>([]);

  // Reset DSP state when the user toggles filtering so the next frames are
  // processed with a clean pipeline rather than stale filter history.
  useEffect(() => {
    processor.reset();
    rollingBuffer.current = [];
  }, [isFilteringEnabled, processor]);

  // Sync Redux scenario state to the hardware connector
  useEffect(() => {
    connector.setScenario(scenario);
  }, [scenario, connector]);

  useEffect(() => {
    connector.onConnectionStatusChange((status) => {
      dispatch(connectionChanged(status));
      if (!status.connected) {
        // Only reset state on actual disconnection
        processor.reset();
        rollingBuffer.current = [];
      }
    });

    const unsubscribeEMG = connector.subscribeToEMG((rawFrame) => {
      // 1. Apply DSP filters (HPF/LPF/Notch) if enabled
      let frameToDispatch = rawFrame;
      if (isFilteringEnabledRef.current) {
        frameToDispatch = processor.processEMG(rawFrame);
      }

      dispatch(emgFrameReceived(frameToDispatch));

      // 2. Feature Extraction (RMS/MAV)
      // Add new sample to rolling buffer
      rollingBuffer.current.push(frameToDispatch.channels);

      // Keep buffer size limited to WINDOW_SIZE
      if (rollingBuffer.current.length > WINDOW_SIZE) {
        rollingBuffer.current.shift();
      }

      // Only dispatch features once the IIR filter has settled.
      // The first ~50 frames (1s at 50Hz) show a transient DC spike because
      // the HPF state buffers are still converging. Suppressing features during
      // this window keeps the live graph at zero until the signal is clean.
      const filterReady =
        !isFilteringEnabledRef.current || processor.isWarmedUp();
      if (filterReady && rollingBuffer.current.length === WINDOW_SIZE) {
        const features = FeatureExtractor.extractFeatures(
          rollingBuffer.current,
        );
        dispatch(featuresUpdated(features));
      }
    });

    const unsubscribeIMU = connector.subscribeToIMU((data) => {
      dispatch(imuFrameReceived(data));
    });

    return () => {
      // Unsubscribe our specific callbacks only — do NOT reset the processor
      // here, as that wipes filter state and prevents IIR filters from settling.
      // The processor is memoized and persists for the component lifetime.
      unsubscribeEMG();
      unsubscribeIMU();
      rollingBuffer.current = [];
    };
    // processor is stable (useMemo), omitting it keeps the filter history intact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector, dispatch]);
}
