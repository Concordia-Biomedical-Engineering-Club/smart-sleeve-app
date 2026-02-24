import React from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import StatCard from "../../components/StatCard";
import ProfileAvatarCard from "../../components/ProfileAvatarCard";
import MilestoneListItem from "../../components/MilestoneListItem";
import { Colors, Typography } from "@/constants/theme";
import { router } from "expo-router";

// Mock Data
const MILESTONES = [
  {
    id: "1",
    title: "First Full Extension",
    achievedDate: "Oct 28, 2025",
    unlocked: true,
    icon: require("../../assets/images/trophy.png"),
  },
  {
    id: "2",
    title: "7 Day Streak",
    achievedDate: "Oct 28, 2025",
    unlocked: true,
    icon: require("../../assets/images/trophy.png"),
  },
  {
    id: "3",
    title: "100 Exercises",
    unlocked: false,
    icon: require("../../assets/images/trophy.png"),
  },
];

export default function MilestonesScreen() {
  const colorScheme = useColorScheme() ?? "light";
  console.log("Current Color Scheme:", colorScheme); // Debug log
  const theme = Colors[colorScheme];

  // console.log('🏆 MilestonesScreen Theme:', colorScheme);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/modal')} style={styles.iconButton}>
          <Image
            source={require("../../assets/images/settings.png")}
            style={[styles.icon, { tintColor: theme.icon }]}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Image
            source={require("../../assets/images/notification.png")}
            style={[styles.icon, { tintColor: theme.icon }]}
          />
        </TouchableOpacity>
      </View>

      {/* Profile Avatar Section */}
      <ProfileAvatarCard
        name="Emily"
        membership="Premium Member"
        avatar={require("../../assets/images/avatar.png")}
        starIcon={require("../../assets/images/star.png")}
      />

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.row}>
          <StatCard
            value="3/10"
            label="Milestones"
            image={require("../../assets/images/trophy.png")}
            imageStyle={{ width: 72, height: 84, bottom: 10, right: 10 }}
          />

          <StatCard
            value="12 Days"
            label="Current Streak"
            image={require("../../assets/images/fire.png")}
            imageStyle={{ width: 100, height: 100, bottom: -10, right: -10 }}
          />
        </View>

        <View style={styles.row}>
          <StatCard
            value="132"
            label="Exercises"
            image={require("../../assets/images/target.png")}
            imageStyle={{ width: 89, height: 100, bottom: 5, right: 5 }}
          />

          <StatCard
            value="94%"
            label={"Average\nCompliance"}
            image={require("../../assets/images/woman.png")}
            imageStyle={{ width: 100, height: 100, bottom: -10, right: -10 }}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Your Milestones
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={MILESTONES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MilestoneListItem
            title={item.title}
            achievedDate={item.achievedDate}
            unlocked={item.unlocked}
            icon={item.icon}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
  },
  statsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 10,
  },
  iconButton: {
    padding: 8,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  sectionTitle: {
    ...Typography.heading2,
    marginBottom: 16,
    textAlign: "center",
  },
});
