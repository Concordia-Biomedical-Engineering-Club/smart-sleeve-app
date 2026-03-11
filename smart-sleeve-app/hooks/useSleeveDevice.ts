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
import { selectCalibration, selectIsCalibrated } from "@/store/userSlice";

const WINDOW_SIZE = 10; // 200ms at 50Hz

export function useSleeveDevice(connector: ISleeveConnector) {
  const dispatch = useAppDispatch();
  const isFilteringEnabled = useSelector(
    (state: RootState) => state.device.isFilteringEnabled,
  );
  const isFilteringEnabledRef = useRef(isFilteringEnabled);
  const scenario = useSelector((state: RootState) => state.device.scenario);
  const calibration = useSelector(selectCalibration);
  const isCalibrated = useSelector(selectIsCalibrated);
  const calibrationRef = useRef(calibration);
  const isCalibratedRef = useRef(isCalibrated);

  useEffect(() => {
    isFilteringEnabledRef.current = isFilteringEnabled;
  }, [isFilteringEnabled]);

  useEffect(() => {
    calibrationRef.current = calibration;
    isCalibratedRef.current = isCalibrated;
  }, [calibration, isCalibrated]);

  const processor = useMemo(() => new SignalProcessor(), []);
  const rollingBuffer = useRef<number[][]>([]);

<<<<<<< Updated upstream
  // Reset DSP state when the user toggles filtering so the next frames are
  // processed with a clean pipeline rather than stale filter history.
  useEffect(() => {
    processor.reset();
    rollingBuffer.current = [];
  }, [isFilteringEnabled, processor]);

  // Sync Redux scenario state to the hardware connector
=======
>>>>>>> Stashed changes
  useEffect(() => {
    connector.setScenario(scenario);
  }, [scenario, connector]);

  useEffect(() => {
    connector.onConnectionStatusChange((status) => {
      dispatch(connectionChanged(status));
      if (!status.connected) {
<<<<<<< Updated upstream
        // Only reset state on actual disconnection
=======
>>>>>>> Stashed changes
        processor.reset();
        rollingBuffer.current = [];
      }
    });

<<<<<<< Updated upstream
    const unsubscribeEMG = connector.subscribeToEMG((rawFrame) => {
      // 1. Apply DSP filters (HPF/LPF/Notch) if enabled
=======
    connector.subscribeToEMG((rawFrame) => {
>>>>>>> Stashed changes
      let frameToDispatch = rawFrame;
      if (isFilteringEnabledRef.current) {
        frameToDispatch = processor.processEMG(rawFrame);
      }

      dispatch(emgFrameReceived(frameToDispatch));


      rollingBuffer.current.push(frameToDispatch.channels);
<<<<<<< Updated upstream

      // Keep buffer size limited to WINDOW_SIZE
=======
>>>>>>> Stashed changes
      if (rollingBuffer.current.length > WINDOW_SIZE) {
        rollingBuffer.current.shift();
      }

<<<<<<< Updated upstream
      // Only dispatch features once the IIR filter has settled.
      // The first ~50 frames (1s at 50Hz) show a transient DC spike because
      // the HPF state buffers are still converging. Suppressing features during
      // this window keeps the live graph at zero until the signal is clean.
      const filterReady =
        !isFilteringEnabledRef.current || processor.isWarmedUp();
      if (filterReady && rollingBuffer.current.length === WINDOW_SIZE) {
        const features = FeatureExtractor.extractFeatures(
          rollingBuffer.current,
=======
      if (rollingBuffer.current.length === WINDOW_SIZE) {
        // Use normalized features if calibrated, otherwise raw
        const features = FeatureExtractor.extractFeaturesWithNormalization(
          rollingBuffer.current,
          isCalibratedRef.current ? calibrationRef.current : null
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    // processor is stable (useMemo), omitting it keeps the filter history intact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector, dispatch]);
}
=======
  }, [connector, dispatch, processor]);
}
>>>>>>> Stashed changes
