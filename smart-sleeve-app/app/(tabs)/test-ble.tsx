import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MockSleeveConnector } from "@/services/MockBleService/MockSleeveConnector";
import { SignalProcessor } from "@/services/SignalProcessing/SignalProcessor";
import { Colors } from "@/constants/theme";
import type {
  EMGData,
  IMUData,
  ConnectionStatus,
} from "@/services/MockBleService/ISleeveConnector";

export default function TestBLEScreen() {
  const [connector] = useState(() => new MockSleeveConnector());
  // SignalProcessor Visual Demo Config:
  // Sample Rate: 50Hz (Matches Mock)
  // Notch: 10Hz (Matches simulated 'line noise' alias)
  // HighPass: 2Hz (Removes slow drift)
  // LowPass: 20Hz (Allows 'muscle' signal)
  const [signalProcessor] = useState(() => new SignalProcessor(50, 10, 2, 20)); 
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [latestEMG, setLatestEMG] = useState<EMGData | null>(null);
  const [latestIMU, setLatestIMU] = useState<IMUData | null>(null);
  const [emgCount, setEmgCount] = useState(0);
  const [imuCount, setImuCount] = useState(0);
  const [currentScenario, setCurrentScenario] = useState<
    "REST" | "FLEX" | "SQUAT"
  >("REST");
  
  const [isFilteringEnabled, setIsFilteringEnabled] = useState(false);
  const isFilteringEnabledRef = useRef(false);
  const lastChartUpdateRef = useRef(0);
  
  // Chart Data State
  const [chartData, setChartData] = useState<number[]>(new Array(20).fill(0));
  const MAX_POINTS = 30;

  // Sync ref with state
  useEffect(() => {
    isFilteringEnabledRef.current = isFilteringEnabled;
  }, [isFilteringEnabled]);

  useEffect(() => {
    // Subscribe to connection status changes
    connector.onConnectionStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Subscribe to EMG data
    connector.subscribeToEMG((data) => {
      let processedData = data;
      if (isFilteringEnabledRef.current) {
          processedData = signalProcessor.processEMG(data);
      }
      
      setLatestEMG(processedData);
      setEmgCount((prev) => prev + 1);
      
      // Update Chart Data (Channel 1 only for viz) - Throttled for readability
      const now = Date.now();
      if (now - lastChartUpdateRef.current > 100) { // Update chart max every 100ms (10fps)
          lastChartUpdateRef.current = now;
          setChartData(prev => {
              const newData = [...prev, processedData.channels[0]];
              if (newData.length > MAX_POINTS) return newData.slice(newData.length - MAX_POINTS);
              return newData;
          });
      }
    });

    // Subscribe to IMU data
    connector.subscribeToIMU((data) => {
      setLatestIMU(data);
      setImuCount((prev) => prev + 1);
    });

    return () => {
      connector.disconnect();
    };
  }, [connector, signalProcessor]);

  const handleConnect = async () => {
    try {
      await connector.connect("mock-device-id");
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleDisconnect = () => {
    connector.disconnect();
    setEmgCount(0);
    setImuCount(0);
  };

  const handleScenarioChange = (scenario: "REST" | "FLEX" | "SQUAT") => {
    connector.setScenario(scenario);
    setCurrentScenario(scenario);
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
             <TouchableOpacity
              style={[
                styles.button,
                { marginTop: 12, backgroundColor: isFilteringEnabled ? Colors.light.success : Colors.light.icon }
              ]}
              onPress={() => setIsFilteringEnabled(!isFilteringEnabled)}
            >
              <ThemedText style={styles.buttonText}>
                {isFilteringEnabled ? "Filters ON" : "Filters OFF (Raw)"}
              </ThemedText>
            </TouchableOpacity>
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
                    backgroundColor: "#022173",
                    backgroundGradientFrom: "#022173",
                    backgroundGradientTo: "#1b3fa0",
                    decimalPlaces: 2, // optional, defaults to 2dp
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: {
                        borderRadius: 16
                    },
                    propsForDots: {
                        r: "3",
                        strokeWidth: "2",
                        stroke: "#ffa726"
                    }
                }}
                bezier
                style={{
                    marginVertical: 8,
                    borderRadius: 16
                }}
            />
            <ThemedText style={styles.instruction}>
                {isFilteringEnabled ? "Signal is stabilized (DC/Line noise removed)" : "Signal contains randomized noise + drift"}
            </ThemedText>
        </View>

        {/* Scenario Controls */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Scenario: {currentScenario}</ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.scenarioButton,
                currentScenario === "REST" && styles.activeScenario,
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
                currentScenario === "FLEX" && styles.activeScenario,
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
                currentScenario === "SQUAT" && styles.activeScenario,
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
          <ThemedText>Values: {latestEMG?.channels[0].toFixed(3) ?? '0.00'}</ThemedText>
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
            Latest IMU Data (Orientation angles)
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
                  Math.abs(latestIMU.roll) > 20 ? styles.activeChannel : {},
                ]}
              >
                Roll: {latestIMU.roll.toFixed(2)}° (side tilt)
              </ThemedText>
              <ThemedText
                style={[
                  styles.monoText,
                  Math.abs(latestIMU.pitch) > 20 ? styles.activeChannel : {},
                ]}
              >
                Pitch: {latestIMU.pitch.toFixed(2)}° (forward/back)
              </ThemedText>
              <ThemedText style={styles.monoText}>
                Yaw: {latestIMU.yaw.toFixed(2)}° (rotation - minimal for knee)
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
