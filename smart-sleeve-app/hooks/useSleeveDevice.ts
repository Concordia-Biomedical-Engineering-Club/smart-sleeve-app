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
  const isFilteringEnabled = useSelector((state: RootState) => state.device.isFilteringEnabled);
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

  // Sync Redux scenario state to the hardware connector
  useEffect(() => {
    connector.setScenario(scenario);
  }, [scenario, connector]);

  useEffect(() => {
    connector.onConnectionStatusChange((status) => {
      dispatch(connectionChanged(status));
      if (!status.connected) {
         processor.reset();
         rollingBuffer.current = [];
      }
    });

    connector.subscribeToEMG((rawFrame) => {
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

      // Compute features if buffer is full
      if (rollingBuffer.current.length === WINDOW_SIZE) {
        const features = FeatureExtractor.extractFeatures(rollingBuffer.current);
        dispatch(featuresUpdated(features));
      }
    });

    connector.subscribeToIMU((data) => {
      dispatch(imuFrameReceived(data));
    });

    return () => {
      connector.disconnect();
      dispatch(connectionChanged({ connected: false }));
      processor.reset();
      rollingBuffer.current = [];
    };
  }, [connector, dispatch, processor]);
}
