import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography, Shadows } from "@/constants/theme";
import { IconSymbol } from "./ui/icon-symbol";
import { ThemedText } from "./themed-text";

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
        { 
          backgroundColor: unlocked ? theme.cardBackground : theme.secondaryCard, 
          borderColor: unlocked ? 'transparent' : theme.border 
        },
        unlocked && Shadows.card,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: unlocked ? theme.primary + '10' : theme.background }]}>
         <Image
          source={icon}
          style={[styles.icon, !unlocked && styles.lockedIcon, { tintColor: unlocked ? theme.primary : theme.textTertiary }]}
        />
      </View>

      <View style={styles.textContainer}>
        <ThemedText
          type="bodyBold"
          style={[
            styles.title,
            !unlocked && { color: theme.textTertiary },
          ]}
        >
          {title}
        </ThemedText>

        {unlocked ? (
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Unlocked on {achievedDate}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.lockedSubtitle, { color: theme.textTertiary }]}>
            Keep training to unlock
          </ThemedText>
        )}
      </View>

      {unlocked ? (
        <View style={[styles.statusBadge, { backgroundColor: theme.success + '15' }]}>
           <IconSymbol name="checkmark.seal.fill" size={14} color={theme.success} />
        </View>
      ) : (
        <IconSymbol name="clock.fill" size={16} color={theme.textTertiary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    gap: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.caption,
  },
  lockedSubtitle: {
    ...Typography.caption,
    fontStyle: 'italic',
  },
  icon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  lockedIcon: {
    opacity: 0.2,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
