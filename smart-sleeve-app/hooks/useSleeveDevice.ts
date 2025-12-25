import { ISleeveConnector } from "@/services/MockBleService/ISleeveConnector";
import { useAppDispatch } from "./storeHooks";
import { useEffect } from "react";
import {
  connectionChanged,
  emgFrameReceived,
  imuFrameReceived,
} from "@/store/deviceSlice";

export function useSleeveDevice(connector: ISleeveConnector) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    connector.onConnectionStatusChange((status) => {
      dispatch(connectionChanged(status));
    });

    connector.subscribeToEMG((data) => {
      dispatch(emgFrameReceived(data));
    });

    connector.subscribeToIMU((data) => {
      dispatch(imuFrameReceived(data));
    });

    return () => {
      connector.disconnect();
      dispatch(connectionChanged({ connected: false }));
    };
  }, [connector,dispatch]);
}
