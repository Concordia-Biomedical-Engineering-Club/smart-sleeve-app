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
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";
import {
  selectKneeAngleBuffer,
  selectIsWorkoutActive,
  startWorkout,
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
import { WorkoutOverlay } from "@/components/dashboard/WorkoutOverlay";

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  const kneeAngleBuffer = useSelector(selectKneeAngleBuffer);
  const isWorkoutActive = useSelector(selectIsWorkoutActive);

  const currentKneeAngle =
    kneeAngleBuffer.length > 0
      ? Math.round(kneeAngleBuffer[kneeAngleBuffer.length - 1])
      : 0;

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [timeframe, setTimeframe] = useState("Daily");

  const userName = user?.email ? user.email.split("@")[0] : "Emily";

  const handleStartSession = () => {
    dispatch(
      startWorkout({
        exerciseId: "quad-sets",
        exerciseName: "Quad Sets",
        targetSide: "LEFT",
        totalReps: 5,
        workDurationSec: 5,
        restDurationSec: 3,
      })
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.push("/modal")}
              style={styles.iconButton}
            >
              <Image
                source={require("../../assets/images/settings.png")}
                style={{
                  width: 24,
                  height: 24,
                  resizeMode: "contain",
                  tintColor: theme.icon ?? theme.text,
                }}
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

        {/* Action Section */}
        <TouchableOpacity 
          style={[styles.libraryAction, { backgroundColor: theme.tint + '15', borderColor: theme.tint }]}
          onPress={() => router.push('/(tabs)/exercises')}
        >
          <View style={styles.actionTextContainer}>
            <ThemedText style={[styles.actionTitle, { color: theme.tint }]}>Start Exercise Session</ThemedText>
            <ThemedText style={[styles.actionSubtitle, { color: theme.textSecondary }]}>Choose from your clinical library</ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={24} color={theme.tint} />
        </TouchableOpacity>

        {/* Main Chart Section */}
        <CircularDataCard
          title="Flexion"
          currentValue={`${currentKneeAngle}°`}
          goalValue="Goal: 120°"
          percentage={(currentKneeAngle / 120) * 100}
        />

        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.success }]}
          onPress={handleStartSession}
        >
          <ThemedText style={styles.startButtonText}>
            ▶  Quick Start (Quad Sets)
          </ThemedText>
        </TouchableOpacity>

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

        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <StatCard value="-1°" label="Goal: 0°" />
            <StatCard value="12 Days" label="Current Streak" />
          </View>
          <View style={styles.gridRow}>
            <StatCard value="5 of 6" label="Exercises" />
            <StatCard value="3/10" label="Pain Level" />
          </View>
        </View>
      </ScrollView>

      {isWorkoutActive && <WorkoutOverlay />}
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
  startButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  sectionContainer: {
    marginVertical: 20,
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 4,
  },
  gridContainer: {
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  libraryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'space-between',
  },
  actionTextContainer: {
    gap: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionSubtitle: {
    fontSize: 13,
  },
});
