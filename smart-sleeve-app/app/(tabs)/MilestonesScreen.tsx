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

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ThemedText } from "@/components/themed-text";

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
  const theme = Colors[colorScheme];

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <ScreenHeader 
        badgeLabel="PLAYER PROFILE"
        rightIcon="trophy.fill"
      />

      <ProfileAvatarCard
        name="Emily Watson"
        membership="Premium Athlete"
        avatar={require("../../assets/images/avatar.png")}
        starIcon={require("../../assets/images/star.png")}
      />

      <View style={styles.statsContainer}>
        <View style={styles.row}>
          <StatCard
            value="3/10"
            label="Milestones"
          />
          <StatCard
            value="12 Days"
            label="Streak"
          />
        </View>

        <View style={styles.row}>
          <StatCard
            value="132"
            label="Exercises"
          />
          <StatCard
            value="94%"
            label="Compliance"
          />
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <ThemedText type="label" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          RECENT ACHIEVEMENTS
        </ThemedText>
        <View style={styles.pill}>
           <ThemedText style={[styles.pillText, { color: theme.primary }]}>ALL</ThemedText>
        </View>
      </View>
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
  container: { flex: 1 },
  listContent: { padding: 24, paddingBottom: 40 },
  headerContainer: { marginBottom: 32 },
  statsContainer: { gap: 16, marginBottom: 40 },
  row: { flexDirection: "row", gap: 16 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.05)' },
  pillText: { fontSize: 10, fontWeight: '800' },
});
