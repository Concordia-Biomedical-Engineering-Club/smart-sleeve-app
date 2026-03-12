import { ISleeveConnector } from "@/services/SleeveConnector/ISleeveConnector";
import { MockSleeveConnector } from "@/services/MockBleService/MockSleeveConnector";
import { useAppDispatch } from "./storeHooks";
import { useEffect, useMemo, useRef } from "react";
import {
  calibrationSampleReceived,
  connectionChanged,
  emgFrameReceived,
  featuresUpdated,
  imuFrameReceived,
  signalWarmupChanged,
  transportDiagnosticsChanged,
  transportEventRecorded,
} from "@/store/deviceSlice";
import { SignalProcessor } from "@/services/SignalProcessing/SignalProcessor";
import { FeatureExtractor } from "@/services/SignalProcessing/FeatureExtractor";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { selectCalibration, selectIsCalibrated } from "@/store/userSlice";
import { selectCalibrationScenarioOverride } from "@/store/deviceSlice";

const WINDOW_SIZE = 10;
const USE_MOCK_HARDWARE_ENV_KEY = [
  "EXPO",
  "PUBLIC",
  "USE",
  "MOCK",
  "HARDWARE",
].join("_");

export function useSleeveDevice(connector: ISleeveConnector) {
  const dispatch = useAppDispatch();
  const isFilteringEnabled = useSelector(
    (state: RootState) => state.device.isFilteringEnabled,
  );
  const isFilteringEnabledRef = useRef(isFilteringEnabled);
  const scenario = useSelector((state: RootState) => state.device.scenario);
  const calibrationScenarioOverride = useSelector(
    selectCalibrationScenarioOverride,
  );
  const calibration = useSelector(selectCalibration);
  const isCalibrated = useSelector(selectIsCalibrated);
  const calibrationRef = useRef(calibration);
  const isCalibratedRef = useRef(isCalibrated);
  const isSignalWarmedUpRef = useRef(false);

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
    // Calibration owns the mock scenario temporarily; outside calibration we fall back to workout-driven behavior.
    connector.setScenario(calibrationScenarioOverride ?? scenario);
  }, [calibrationScenarioOverride, scenario, connector]);

  useEffect(() => {
    const requestedTransportMode =
      process.env[USE_MOCK_HARDWARE_ENV_KEY] !== "false" ? "mock" : "real";
    const activeTransportMode =
      connector instanceof MockSleeveConnector ? "mock" : "real";

    dispatch(
      transportDiagnosticsChanged({
        requestedTransportMode,
        activeTransportMode,
        usingFallbackTransport:
          requestedTransportMode === "real" && activeTransportMode === "mock",
      }),
    );
  }, [connector, dispatch]);

  useEffect(() => {
    const unsubscribeConnectionStatus = connector.onConnectionStatusChange(
      (status) => {
        dispatch(connectionChanged(status));
        if (!status.connected) {
          processor.reset();
          rollingBuffer.current = [];
          isSignalWarmedUpRef.current = false;
        }
      },
    );

    const unsubscribeEMG = connector.subscribeToEMG((rawFrame) => {
      let frameToDispatch = rawFrame;
      if (isFilteringEnabledRef.current) {
        frameToDispatch = processor.processEMG(rawFrame);
      }

      const isSignalWarmedUp = isFilteringEnabledRef.current
        ? processor.isWarmedUp()
        : true;

      if (isSignalWarmedUpRef.current !== isSignalWarmedUp) {
        isSignalWarmedUpRef.current = isSignalWarmedUp;
        dispatch(signalWarmupChanged(isSignalWarmedUp));
      }

      dispatch(emgFrameReceived(frameToDispatch));
      // Calibration samples are captured before feature aggregation so calibration does not reuse smoothed dashboard RMS snapshots.
      dispatch(calibrationSampleReceived(frameToDispatch.channels.slice()));

      rollingBuffer.current.push(frameToDispatch.channels);
      if (rollingBuffer.current.length > WINDOW_SIZE) {
        rollingBuffer.current.shift();
      }

      if (rollingBuffer.current.length === WINDOW_SIZE) {
        const features = FeatureExtractor.extractFeaturesWithNormalization(
          rollingBuffer.current,
          isCalibratedRef.current ? calibrationRef.current : null,
        );
        dispatch(featuresUpdated(features));
      }
    });

    const unsubscribeIMU = connector.subscribeToIMU((data) => {
      dispatch(imuFrameReceived(data));
    });

    const unsubscribeTransportEvents = connector.onTransportEvent((event) => {
      dispatch(transportEventRecorded(event));
    });

    return () => {
      unsubscribeConnectionStatus();
      unsubscribeEMG();
      unsubscribeIMU();
      unsubscribeTransportEvents();
      connector.disconnect();
      dispatch(connectionChanged({ connected: false }));
      processor.reset();
      rollingBuffer.current = [];
      isSignalWarmedUpRef.current = false;
    };
  }, [connector, dispatch, processor]);
}
