import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography, Shadows } from "@/constants/theme";

interface MilestoneCardProps {
  title: string;
  achievedDate?: string;
  unlocked: boolean;
  icon: any;
}

export default function MilestoneListItem({
  title,
  achievedDate,
  unlocked,
  icon,
}: MilestoneCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.cardBackground },
        !unlocked && {
          backgroundColor: colorScheme === "light" ? "#f4f4f4" : "#2a2a2a",
        },
      ]}
    >
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            { color: theme.text },
            !unlocked && { color: theme.textTertiary },
          ]}
        >
          {title}
        </Text>

        {unlocked ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Achieved on {achievedDate}
          </Text>
        ) : (
          <Text style={[styles.lockedSubtitle, { color: theme.textTertiary }]}>
            Keep up with your exercises to unlock this next!
          </Text>
        )}
      </View>

      <Image
        source={icon}
        style={[styles.icon, !unlocked && styles.lockedIcon]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    ...Shadows.card,
    width: "100%",
    minHeight: 84,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
    alignItems: "flex-start",
  },
  title: {
    ...Typography.heading3,
    textAlign: "left",
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.caption,
    textAlign: "left",
  },
  lockedSubtitle: {
    ...Typography.caption,
    textAlign: "left",
  },
  icon: {
    width: 32,
    height: 32,
  },
  lockedIcon: {
    opacity: 0.4,
  },
});
