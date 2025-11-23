import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

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
  return (
    <View style={[styles.card, !unlocked && styles.lockedCard]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, !unlocked && styles.lockedText]}>
          {title}
        </Text>

        {unlocked ? (
          <Text style={styles.subtitle}>Achieved on {achievedDate}</Text>
        ) : (
          <Text style={styles.lockedSubtitle}>
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
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    width: 370,
    height: 84,
  },
  lockedCard: {
    backgroundColor: "#f4f4f4",
  },
  textContainer: {
    width: "75%",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  lockedText: {
    color: "#999",
  },
  subtitle: {
    marginTop: 4,
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  lockedSubtitle: {
    marginTop: 4,
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
  },
  icon: {
    width: 32,
    height: 32,
  },
  lockedIcon: {
    opacity: 0.4,
  },
});
