import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
  // Text removed as it is no longer used directly (we use ThemedText)
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { 
  selectKneeAngleBuffer,
} from "../../store/deviceSlice";
import { RootState } from "../../store/store";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { CircularDataCard } from "@/components/dashboard/CircularDataCard";
import StatCard from "@/components/StatCard";

import { RMSGraph } from "@/components/dashboard/RMSGraph";

// Placeholder Assets - in a real app, import these from assets/images
// For now, we pass undefined to StatCard which will just not render an image.

export default function DashboardScreen() {
  const user = useSelector((state: RootState) => state.user);
  const kneeAngleBuffer = useSelector(selectKneeAngleBuffer);
  
  // Calculate current knee angle for display
  const currentKneeAngle = kneeAngleBuffer.length > 0
    ? Math.round(kneeAngleBuffer[kneeAngleBuffer.length - 1])
    : 0;

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
          currentValue={`${currentKneeAngle}°`}
          goalValue="Goal: 120°"
          percentage={(currentKneeAngle / 120) * 100}
        />

        {/* Live Activation Graphs */}
        <View style={styles.sectionContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Live Muscle Activation
          </ThemedText>
          <RMSGraph 
            channelIndex={0} 
            label="Vastus Medialis Oblique (VMO)" 
            lineColor={theme.tint} 
          />
          <RMSGraph 
            channelIndex={1} 
            label="Vastus Lateralis (VL)" 
            lineColor="#FF6B6B"
          />
          <RMSGraph 
            channelIndex={2} 
            label="Semitendinosus (Medial Hamstring)" 
            lineColor="#4ECDC4"
            height={100}
          />
          <RMSGraph 
            channelIndex={3} 
            label="Biceps Femoris (Lateral Hamstring)" 
            lineColor="#FFE66D"
            height={100}
          />
        </View>

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
  sectionContainer: {
    marginVertical: 20,
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 4,
  },
});
