import { LineChart } from "react-native-chart-kit";
import {
  Dimensions,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useSleeve } from "@/hooks/useSleeve";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { scenarioChanged, setFilteringEnabled } from "@/store/deviceSlice";

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

  const lastChartUpdateRef = useRef(0);

  // Chart Data State
  const [chartData, setChartData] = useState<number[]>(new Array(50).fill(0));
  const MAX_POINTS = 50;

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

  useEffect(() => {
    lastChartUpdateRef.current = 0;
    setChartData(new Array(MAX_POINTS).fill(0));
  }, [isFilteringEnabled]);

  const handleConnect = async () => {
    try {
      await connector.connect("mock-device-id");
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleDisconnect = () => {
    connector.disconnect();
  };

  const handleScenarioChange = (newScenario: "REST" | "FLEX" | "SQUAT") => {
    dispatch(scenarioChanged(newScenario));
  };

  const handleToggleFiltering = () => {
    dispatch(setFilteringEnabled(!isFilteringEnabled));
  };

  // Get screen width for chart
  const screenWidth = Dimensions.get("window").width;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Mock BLE Service Test
        </ThemedText>

        {/* Connection Controls */}
        <View style={styles.section}>
          <ThemedText type="subtitle">
            Connection Status:{" "}
            {connectionStatus.connected ? "Connected" : "Disconnected"}
          </ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                connectionStatus.connected && styles.buttonDisabled,
              ]}
              onPress={handleConnect}
              disabled={connectionStatus.connected}
            >
              <ThemedText style={styles.buttonText}>Connect</ThemedText>
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
        </View>

        {/* Filter Toggle */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Signal Processing</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle signal filters"
            testID="toggle-signal-filters"
            hitSlop={12}
            style={({ pressed }) => [
              styles.button,
              styles.filterButton,
              {
                marginTop: 12,
                backgroundColor: isFilteringEnabled
                  ? Colors.light.success
                  : Colors.light.icon,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleToggleFiltering}
          >
            <ThemedText style={styles.buttonText}>
              {isFilteringEnabled ? "Filters ON" : "Filters OFF (Raw)"}
            </ThemedText>
          </Pressable>
          <ThemedText style={styles.instruction}>
            Current mode: {isFilteringEnabled ? "Filtered EMG" : "Raw EMG"}
          </ThemedText>
        </View>

        {/* Real-time Chart */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Live Signal (CH1)</ThemedText>
          <LineChart
            key={`ble-chart-${isFilteringEnabled ? "filtered" : "raw"}`}
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
          {isFilteringEnabled ? (
            <ThemedText style={styles.instruction}>
              Filtered mode needs about 1 second of fresh samples after a
              toggle.
            </ThemedText>
          ) : null}
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
  filterButton: {
    flex: 0,
    minHeight: 48,
    justifyContent: "center",
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
  highlight: {
    marginTop: 8,
    color: "#00B8A9",
    fontWeight: "bold",
  },
  activeChannel: {
    color: "#E94B3C",
    fontWeight: "bold",
  },
});
