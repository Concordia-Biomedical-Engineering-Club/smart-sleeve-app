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

/**
 * Minimum interval between Redux state updates for visualization buffers
 * (emgBuffer, kneeAngleBuffer, latestCalibrationSample, latestIMU).
 * Signal processing and feature extraction always run at full 50 Hz;
 * only the Redux writes that trigger React re-renders are throttled.
 * 100 ms → 10 Hz, which is more than fast enough for the dashboard UI.
 */
const VISUALIZATION_DISPATCH_INTERVAL_MS =
  process.env.NODE_ENV === "test" ? 0 : 100;

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
  // Throttle refs — track the last time we wrote to Redux visualization state
  const lastEmgDispatchRef = useRef(0);
  const lastImuDispatchRef = useRef(0);
  const lastFeatureDispatchRef = useRef(0);

  useEffect(() => {
    // Calibration owns the mock scenario temporarily; outside calibration we fall back to workout-driven behavior.
    connector.setScenario(calibrationScenarioOverride ?? scenario);
  }, [calibrationScenarioOverride, scenario, connector]);

  useEffect(() => {
    const requestedTransportMode =
      process.env[USE_MOCK_HARDWARE_ENV_KEY] === "true" ? "mock" : "real";
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

      // ── Signal processing runs at full 50 Hz ──
      rollingBuffer.current.push(frameToDispatch.channels);
      if (rollingBuffer.current.length > WINDOW_SIZE) {
        rollingBuffer.current.shift();
      }

      if (rollingBuffer.current.length === WINDOW_SIZE) {
        const features = FeatureExtractor.extractFeaturesWithNormalization(
          rollingBuffer.current,
          isCalibratedRef.current ? calibrationRef.current : null,
        );

        // Keep feature extraction at full cadence, but throttle Redux writes.
        const now = Date.now();
        if (
          now - lastFeatureDispatchRef.current >=
          VISUALIZATION_DISPATCH_INTERVAL_MS
        ) {
          lastFeatureDispatchRef.current = now;
          dispatch(featuresUpdated(features));
        }
      }

      // ── Redux visualization + recording writes throttled to 10 Hz ──
      // This prevents the dashboard from re-rendering at 50 Hz, which was
      // causing a JS thread overload / crash after ~10 seconds of BLE data.
      const now = Date.now();
      if (
        now - lastEmgDispatchRef.current >=
        VISUALIZATION_DISPATCH_INTERVAL_MS
      ) {
        lastEmgDispatchRef.current = now;
        dispatch(emgFrameReceived(frameToDispatch));
        dispatch(calibrationSampleReceived(frameToDispatch.channels.slice()));
      }
    });

    const unsubscribeIMU = connector.subscribeToIMU((data) => {
      const now = Date.now();
      if (
        now - lastImuDispatchRef.current >=
        VISUALIZATION_DISPATCH_INTERVAL_MS
      ) {
        lastImuDispatchRef.current = now;
        dispatch(imuFrameReceived(data));
      }
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
