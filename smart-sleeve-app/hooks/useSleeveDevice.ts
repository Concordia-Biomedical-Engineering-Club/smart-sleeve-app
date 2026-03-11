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

const WINDOW_SIZE = 10;

export function useSleeveDevice(connector: ISleeveConnector) {
  const dispatch = useAppDispatch();
  const isFilteringEnabled = useSelector((state: RootState) => state.device.isFilteringEnabled);
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
      let frameToDispatch = rawFrame;
      if (isFilteringEnabledRef.current) {
        frameToDispatch = processor.processEMG(rawFrame);
      }

      dispatch(emgFrameReceived(frameToDispatch));

      rollingBuffer.current.push(frameToDispatch.channels);
      if (rollingBuffer.current.length > WINDOW_SIZE) {
        rollingBuffer.current.shift();
      }

      if (rollingBuffer.current.length === WINDOW_SIZE) {
        const features = FeatureExtractor.extractFeaturesWithNormalization(
          rollingBuffer.current,
          isCalibratedRef.current ? calibrationRef.current : null
        );
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