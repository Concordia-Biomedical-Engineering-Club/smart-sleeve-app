import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { TrendChart } from "@/components/analytics/TrendChart";

export default function MotionAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [timeframe, setTimeframe] = useState("Weekly");

  // Mock data for the chart
  const mockData = {
    labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    datasets: [
      {
        data: [60, 62, 68, 67, 63, 70, 75], // Flexion
        color: () => theme.primary, // Blue
        strokeWidth: 2,
      },
      {
        data: [20, 35, 45, 58, 42, 48, 52], // Extension
        color: () => theme.success, // Green
        strokeWidth: 2,
      },
    ],
    legend: ["Flexion", "Extension"],
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.push("/modal")} style={styles.iconButton}>
              <Image 
                source={require("../../assets/images/settings.png")} 
                style={{ width: 24, height: 24, resizeMode: "contain", tintColor: theme.icon ?? theme.text }} 
              />
            </TouchableOpacity>
            <ThemedText style={Typography.heading2}>Motion Analytics</ThemedText>
            <TouchableOpacity onPress={() => console.log("Notification")} style={styles.iconButton}>
              <IconSymbol name="bell.fill" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeframe Selector */}
        <SegmentedControl
          options={["Daily", "Weekly", "Monthly"]}
          selectedOption={timeframe}
          onSelect={setTimeframe}
        />

        {/* Modular Trend Chart */}
        <TrendChart 
          data={mockData}
          title="Range of Motion"
          subtitle="Last 7 Days"
        />

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
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
  },
});
