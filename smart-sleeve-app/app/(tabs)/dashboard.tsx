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
  selectWorkout,
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
import { EXERCISE_LIBRARY } from "@/constants/exercises";
import { WorkoutOverlay } from "@/components/dashboard/WorkoutOverlay";

const ALL_CHANNELS = (theme: any) => [
  { id: 0, label: "Vastus Medialis (VMO)", color: theme.tint },
  { id: 1, label: "Vastus Lateralis (VL)", color: "#FF6B6B" },
  { id: 2, label: "Semitendinosus (Medial)", color: "#4ECDC4" },
  { id: 3, label: "Biceps Femoris (Lateral)", color: "#FFE66D" },
];

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  const kneeAngleBuffer = useSelector(selectKneeAngleBuffer);
  const isWorkoutActive = useSelector(selectIsWorkoutActive);
  const workout = useSelector(selectWorkout);

  const currentKneeAngle =
    kneeAngleBuffer.length > 0
      ? Math.round(kneeAngleBuffer[kneeAngleBuffer.length - 1])
      : 0;

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [timeframe, setTimeframe] = useState("Daily");

  const userName = user?.email ? user.email.split("@")[0] : "Emily";
  
  const channels = ALL_CHANNELS(theme);

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

  const sortedChannels = React.useMemo(() => {
    if (!isWorkoutActive || !workout.exerciseId) return channels;
    
    const exerciseData = EXERCISE_LIBRARY.find(ex => ex.id === workout.exerciseId);
    if (!exerciseData) return channels;

    const primaries = channels.filter(c => exerciseData.primaryChannels.includes(c.id));
    const secondaries = channels.filter(c => !exerciseData.primaryChannels.includes(c.id));
    
    return [...primaries, ...secondaries];
  }, [isWorkoutActive, workout.exerciseId, channels]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* DYNAMIC HEADER: Integrated Session HUD or Standard Greeting */}
        {!isWorkoutActive ? (
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
            
            <View style={{ marginTop: 16 }}>
              <SegmentedControl
                options={["Daily", "Weekly", "Monthly"]}
                selectedOption={timeframe}
                onSelect={setTimeframe}
              />
            </View>
          </View>
        ) : (
          <View style={styles.workoutHudHeader}>
            <WorkoutOverlay />
          </View>
        )}

        {/* GUIDED SESSION ACTION (Hidden during active workout) */}
        {!isWorkoutActive && (
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
        )}

        {/* PRIMARY METRIC: Transition to semi-transparent during workout or hide optional parts */}
        <CircularDataCard
          title="Flexion Angle"
          currentValue={`${currentKneeAngle}°`}
          goalValue="Goal: 120°"
          percentage={(currentKneeAngle / 120) * 100}
        />

        {!isWorkoutActive && (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.success }]}
            onPress={handleStartSession}
          >
            <ThemedText style={styles.startButtonText}>
              ▶  Quick Start (Quad Sets)
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* BIOFEEDBACK SECTION: Always high visibility */}
        <View style={styles.sectionContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Live Muscle Activation
          </ThemedText>
          
          {sortedChannels.map((channel, index) => {
            const isPrimary = isWorkoutActive && 
              EXERCISE_LIBRARY.find(ex => ex.id === workout.exerciseId)?.primaryChannels.includes(channel.id);
            
            // During workout, shrink the height of "antagonist" or secondary muscles to save space
            const graphHeight = isWorkoutActive && !isPrimary ? 80 : 120;
            
            return (
              <RMSGraph
                key={channel.id}
                channelIndex={channel.id}
                label={channel.label}
                lineColor={channel.color}
                height={graphHeight}
              />
            );
          })}
        </View>

        {/* GRID STATS (Hidden during workout to clear space) */}
        {!isWorkoutActive && (
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
        )}
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
  workoutHudHeader: {
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
});
