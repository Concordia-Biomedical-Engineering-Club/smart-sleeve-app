import { LineChart } from "react-native-chart-kit";
import {
  Dimensions,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useSleeve } from "@/hooks/useSleeve";
import { MockSleeveConnector } from "@/services/MockBleService/MockSleeveConnector";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import {
  scenarioChanged,
  selectTransportDiagnostics,
  setFilteringEnabled,
} from "@/store/deviceSlice";

export default function TestBLEScreen() {
  const dispatch = useDispatch();
  const connector = useSleeve();
  const latestEMG = useSelector((state: RootState) => state.device.latestEMG);
  const latestIMU = useSelector((state: RootState) => state.device.latestIMU);
  const scenario = useSelector((state: RootState) => state.device.scenario);
  const connectionStatus = useSelector(
    (state: RootState) => state.device.connection,
  );
  const isFilteringEnabled = useSelector(
    (state: RootState) => state.device.isFilteringEnabled,
  );
  const transportDiagnostics = useSelector(selectTransportDiagnostics);

  const lastChartUpdateRef = useRef(0);

  const [chartData, setChartData] = useState<number[]>(new Array(50).fill(0));
  const MAX_POINTS = 50;
  const [devices, setDevices] = useState<string[]>([]);
  const [isScanning, setIsScanningState] = useState(false);
  const requestedMockMode =
    process.env.EXPO_PUBLIC_USE_MOCK_HARDWARE !== "false";
  const isUsingMockConnector = connector instanceof MockSleeveConnector;
  const isFallbackRoute = !requestedMockMode && isUsingMockConnector;
  const isMock = isUsingMockConnector;
  const now = Date.now();
  const lastEmgAgeMs = transportDiagnostics.lastEMGPacketTimestamp
    ? now - transportDiagnostics.lastEMGPacketTimestamp
    : null;
  const lastImuAgeMs = transportDiagnostics.lastIMUPacketTimestamp
    ? now - transportDiagnostics.lastIMUPacketTimestamp
    : null;

  // Update Chart Data (Channel 1 only for viz) - Throttled for readability
  useEffect(() => {
    if (!latestEMG) return;
    const now = Date.now();
    if (now - lastChartUpdateRef.current > 100) {
      lastChartUpdateRef.current = now;
      setChartData((prev) => {
        const newData = [...prev, latestEMG.channels[0]];
        if (newData.length > MAX_POINTS)
          return newData.slice(newData.length - MAX_POINTS);
        return newData;
      });
    }
  }, [latestEMG]);

  const handleScan = async () => {
    setIsScanningState(true);
    setDevices([]);
    try {
      const found = await connector.scan();
      setDevices(found);
    } finally {
      setIsScanningState(false);
    }
  };

  const handleConnect = async (deviceId: string) => {
    try {
      await connector.connect(deviceId);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleDisconnect = () => {
    connector.disconnect();
    setDevices([]);
  };

  const handleScenarioChange = (newScenario: "REST" | "FLEX" | "SQUAT") => {
    dispatch(scenarioChanged(newScenario));
  };

  // Get screen width for chart
  const screenWidth = Dimensions.get("window").width;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          {requestedMockMode
            ? "Mock BLE Service Test"
            : "Real Hardware BLE Test"}
        </ThemedText>

        {/* Device Discovery (Real Mode Only) */}
        {!isMock && (
          <View style={styles.section}>
            <ThemedText type="subtitle">Device Discovery</ThemedText>
            <TouchableOpacity
              style={[
                styles.button,
                isScanning && styles.buttonDisabled,
                { marginTop: 12 },
              ]}
              onPress={handleScan}
              disabled={isScanning || connectionStatus.connected}
            >
              <ThemedText style={styles.buttonText}>
                {isScanning ? "Scanning..." : "Scan for Devices"}
              </ThemedText>
            </TouchableOpacity>

            {!connectionStatus.connected && devices.length > 0 && (
              <View style={styles.deviceList}>
                {devices.map((id) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.deviceItem}
                    onPress={() => handleConnect(id)}
                  >
                    <ThemedText style={styles.deviceItemText}>
                      Connect to: {id}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Connection Status & Mock Connect */}
        <View style={styles.section}>
          <ThemedText type="subtitle">
            Status:{" "}
            <ThemedText
              style={{
                color: connectionStatus.connected
                  ? Colors.light.success
                  : Colors.light.warning,
              }}
            >
              {connectionStatus.connected ? "Connected" : "Disconnected"}
            </ThemedText>
          </ThemedText>

          {isFallbackRoute && (
            <ThemedText style={styles.routeHint}>
              Connecting route: bridge
            </ThemedText>
          )}

          {isMock && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  connectionStatus.connected && styles.buttonDisabled,
                ]}
                onPress={() => handleConnect("mock-device-id")}
                disabled={connectionStatus.connected}
              >
                <ThemedText style={styles.buttonText}>
                  {isFallbackRoute ? "Connect" : "Connect Mock"}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.disconnectButton,
                  !connectionStatus.connected && styles.buttonDisabled,
                ]}
                onPress={handleDisconnect}
                disabled={!connectionStatus.connected}
              >
                <ThemedText style={styles.buttonText}>Disconnect</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {!isMock && connectionStatus.connected && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.disconnectButton,
                { marginTop: 12 },
              ]}
              onPress={handleDisconnect}
            >
              <ThemedText style={styles.buttonText}>
                Force Disconnect
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Signal Processing</ThemedText>
          <TouchableOpacity
            style={[
              styles.button,
              {
                marginTop: 12,
                backgroundColor: isFilteringEnabled
                  ? Colors.light.success
                  : Colors.light.icon,
              },
            ]}
            onPress={() => dispatch(setFilteringEnabled(!isFilteringEnabled))}
          >
            <ThemedText style={styles.buttonText}>
              {isFilteringEnabled ? "Filters ON" : "Filters OFF (Raw)"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Transport Diagnostics</ThemedText>
          <ThemedText>
            Requested: {transportDiagnostics.requestedTransportMode}
          </ThemedText>
          <ThemedText>
            Active: {transportDiagnostics.activeTransportMode}
          </ThemedText>
          <ThemedText>
            Phase: {transportDiagnostics.lastConnectionPhase}
          </ThemedText>
          <ThemedText>
            Reconnect attempts: {transportDiagnostics.reconnectAttemptCount}
          </ThemedText>
          <ThemedText>
            EMG packets: {transportDiagnostics.emgPacketCount}
          </ThemedText>
          <ThemedText>
            IMU packets: {transportDiagnostics.imuPacketCount}
          </ThemedText>
          <ThemedText>
            Last EMG age: {lastEmgAgeMs == null ? "-" : `${lastEmgAgeMs} ms`}
          </ThemedText>
          <ThemedText>
            Last IMU age: {lastImuAgeMs == null ? "-" : `${lastImuAgeMs} ms`}
          </ThemedText>
          <ThemedText>
            Characteristics:{" "}
            {transportDiagnostics.discoveredCharacteristics.length > 0
              ? transportDiagnostics.discoveredCharacteristics.join(", ")
              : "-"}
          </ThemedText>
        </View>

        {/* Real-time Chart */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Live Signal (CH1)</ThemedText>
          <LineChart
            data={{
              labels: [], // No labels for cleaner look
              datasets: [
                {
                  data: chartData,
                  strokeWidth: 2, // optional
                },
              ],
            }}
            width={screenWidth - 64} // from react-native
            height={220}
            yAxisInterval={1} // optional, defaults to 1
            withDots={false}
            withInnerLines={false}
            withOuterLines={false}
            chartConfig={{
              backgroundColor: isFilteringEnabled ? "#0B5345" : "#022173",
              backgroundGradientFrom: isFilteringEnabled
                ? "#0B5345"
                : "#022173",
              backgroundGradientTo: isFilteringEnabled ? "#1D8348" : "#1b3fa0",
              decimalPlaces: 2, // optional, defaults to 2dp
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "3",
                strokeWidth: "2",
                stroke: "#ffa726",
              },
            }}
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
          <ThemedText style={styles.instruction}>
            {isFilteringEnabled
              ? "Signal is stabilized (DC/Line noise removed)"
              : "Signal contains randomized noise + drift"}
          </ThemedText>
        </View>

        {/* Scenario Controls */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Scenario: {scenario}</ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.scenarioButton,
                scenario === "REST" && styles.activeScenario,
              ]}
              onPress={() => handleScenarioChange("REST")}
              disabled={!connectionStatus.connected}
            >
              <ThemedText style={styles.buttonText}>REST</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.scenarioButton,
                scenario === "FLEX" && styles.activeScenario,
              ]}
              onPress={() => handleScenarioChange("FLEX")}
              disabled={!connectionStatus.connected}
            >
              <ThemedText style={styles.buttonText}>FLEX</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.scenarioButton,
                scenario === "SQUAT" && styles.activeScenario,
              ]}
              onPress={() => handleScenarioChange("SQUAT")}
              disabled={!connectionStatus.connected}
            >
              <ThemedText style={styles.buttonText}>SQUAT</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Counters */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Data Received (Live)</ThemedText>
          <ThemedText>
            Values: {latestEMG?.channels[0].toFixed(3) ?? "0.00"}
          </ThemedText>
        </View>

        {/* Latest EMG Data */}
        <View style={styles.section}>
          <ThemedText type="subtitle">
            Latest EMG Data (Watch values change!)
          </ThemedText>
          {latestEMG ? (
            <View style={styles.dataBox}>
              <ThemedText style={styles.monoText}>
                Header: 0x{latestEMG.header.toString(16).padStart(2, "0")}
              </ThemedText>
              <ThemedText style={styles.monoText}>
                Timestamp: {latestEMG.timestamp}ms
              </ThemedText>
              <ThemedText style={styles.monoText}>
                Channels (amplitude varies by scenario):
              </ThemedText>
              {latestEMG.channels.map((value, idx) => (
                <ThemedText
                  key={idx}
                  style={[
                    styles.monoText,
                    Math.abs(value) > 0.5 ? styles.activeChannel : {},
                  ]}
                >
                  {"  "}CH{idx + 1}: {value.toFixed(3)}{" "}
                  {Math.abs(value) > 0.5 ? "🔥" : ""}
                </ThemedText>
              ))}
              <ThemedText style={styles.monoText}>
                Checksum: 0x{latestEMG.checksum.toString(16).padStart(2, "0")}
              </ThemedText>
            </View>
          ) : (
            <ThemedText>No data yet</ThemedText>
          )}
        </View>

        {/* Latest IMU Data */}
        <View style={styles.section}>
          <ThemedText type="subtitle">
            Knee Flexion Angle (AS5048A Encoder)
          </ThemedText>
          {latestIMU ? (
            <View style={styles.dataBox}>
              <ThemedText style={styles.monoText}>
                Header: 0x{latestIMU.header.toString(16).padStart(2, "0")}
              </ThemedText>
              <ThemedText style={styles.monoText}>
                Timestamp: {latestIMU.timestamp}ms
              </ThemedText>
              <ThemedText
                style={[
                  styles.monoText,
                  styles.highlight,
                  { fontSize: 18, marginTop: 8 },
                ]}
              >
                🦵 Knee Flexion: {latestIMU.roll.toFixed(1)}°
              </ThemedText>
              <ThemedText style={styles.monoText}>
                {latestIMU.roll < 15 && "  → Standing (Full Extension)"}
                {latestIMU.roll >= 15 &&
                  latestIMU.roll < 45 &&
                  "  → Slight Bend"}
                {latestIMU.roll >= 45 &&
                  latestIMU.roll < 90 &&
                  "  → Moderate Flexion"}
                {latestIMU.roll >= 90 &&
                  latestIMU.roll < 110 &&
                  "  → Deep Flexion (90°+)"}
                {latestIMU.roll >= 110 && "  → Squat Position (110°+)"}
              </ThemedText>
              <ThemedText
                style={[styles.monoText, { marginTop: 8, opacity: 0.6 }]}
              >
                Pitch: {latestIMU.pitch.toFixed(2)}° (unused)
              </ThemedText>
              <ThemedText style={[styles.monoText, { opacity: 0.6 }]}>
                Yaw: {latestIMU.yaw.toFixed(2)}° (unused)
              </ThemedText>
              <ThemedText style={styles.monoText}>
                Checksum: 0x{latestIMU.checksum.toString(16).padStart(2, "0")}
              </ThemedText>
            </View>
          ) : (
            <ThemedText>No data yet</ThemedText>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "rgba(0, 184, 169, 0.1)",
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    backgroundColor: "#00B8A9",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disconnectButton: {
    backgroundColor: "#E94B3C",
  },
  scenarioButton: {
    backgroundColor: "#1E88E5",
  },
  activeScenario: {
    backgroundColor: "#43A047",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  dataBox: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  monoText: {
    fontFamily: "Courier",
    fontSize: 12,
  },
  instruction: {
    marginTop: 4,
    opacity: 0.8,
  },
  routeHint: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.45,
    letterSpacing: 0.3,
  },
  highlight: {
    marginTop: 8,
    color: "#00B8A9",
    fontWeight: "bold",
  },
  activeChannel: {
    color: "#E94B3C",
    fontWeight: "bold",
  },
  deviceList: {
    marginTop: 16,
    gap: 8,
  },
  deviceItem: {
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  deviceItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
