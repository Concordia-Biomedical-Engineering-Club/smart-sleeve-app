import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { 
  selectEmgBuffer, 
  selectKneeAngleBuffer,
  selectEmgBufferLength,
  selectLatestFeatures 
} from "../../store/deviceSlice";
import { RootState } from "../../store/store";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { CircularDataCard } from "@/components/dashboard/CircularDataCard";
import StatCard from "@/components/StatCard";

// Placeholder Assets - in a real app, import these from assets/images
// For now, we pass undefined to StatCard which will just not render an image.

export default function DashboardScreen() {
  const user = useSelector((state: RootState) => state.user);
  const emgBuffer = useSelector(selectEmgBuffer);
  const kneeAngleBuffer = useSelector(selectKneeAngleBuffer);
  const bufferLength = useSelector(selectEmgBufferLength);
  const latestFeatures = useSelector(selectLatestFeatures);

  // Debug logging to verify data flow
  React.useEffect(() => {
    if (bufferLength > 0) {
      console.log(`[Dashboard] Buffer Size: ${bufferLength}, Latest EMG: ${JSON.stringify(emgBuffer[emgBuffer.length - 1])}`);
    }
    if (latestFeatures) {
       console.log(`[Dashboard] Features - RMS: ${latestFeatures.rms[0].toFixed(3)}, MAV: ${latestFeatures.mav[0].toFixed(3)}`);
    }
  }, [bufferLength, emgBuffer, latestFeatures]);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [timeframe, setTimeframe] = useState("Daily");

  // Placeholder Data
  const userName = user?.email ? user.email.split("@")[0] : "Emily"; // Fallback to "Emily" from design if no user

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard Header */}
        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => console.log("Settings")}
              style={styles.iconButton}
            >
              <IconSymbol
                name="slider.horizontal.3"
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => console.log("Notification")}
              style={styles.iconButton}
            >
              <IconSymbol name="bell.fill" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.greeting}>Hey {userName},</ThemedText>
        </View>

        <SegmentedControl
          options={["Daily", "Weekly", "Monthly"]}
          selectedOption={timeframe}
          onSelect={setTimeframe}
        />

        {/* Main Chart Section */}
        <CircularDataCard
          title="Flexion"
          currentValue="115°"
          goalValue="Goal: 120°"
          percentage={95.8}
        />

        {/* Grid Section */}
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <StatCard
              value="-1°"
              label="Goal: 0°"
              // image={require('@/assets/images/leg-placeholder.png')} // Uncomment when assets exist
            />
            <StatCard value="12 Days" label="Current Streak" />
          </View>
          <View style={styles.gridRow}>
            <StatCard value="5 of 6" label="Exercises" />
            <StatCard value="3/10" label="Pain Level" />
          </View>
        </View>
        <View style={styles.debugInfo}>
          <ThemedText type="defaultSemiBold">Live Data Debug:</ThemedText>
          <Text style={{ color: theme.text }}>EMG Points: {bufferLength}</Text>
          <Text style={{ color: theme.text }}>Latest Angle: {kneeAngleBuffer[kneeAngleBuffer.length - 1]?.toFixed(1) ?? 'N/A'}°</Text>
          {latestFeatures && (
            <>
              <Text style={{ color: theme.text, marginTop: 4 }}>RMS (Ch1): {latestFeatures.rms[0].toFixed(4)}</Text>
              <Text style={{ color: theme.text }}>MAV (Ch1): {latestFeatures.mav[0].toFixed(4)}</Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconButton: {
    padding: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
  },
  gridContainer: {
    gap: 12, // Increased gap slightly for StatCard spacing
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12, // Added gap for row items
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  }
});
