import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { IconSymbol, IconSymbolName } from "./icon-symbol";
import { ThemedText } from "../themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ScreenHeaderProps {
  title?: string;
  badgeLabel?: string;
  leftIcon?: IconSymbolName;
  onLeftPress?: () => void;
  leftAccessibilityLabel?: string;
  rightIcon?: IconSymbolName;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  showSettings?: boolean;
}

/**
 * Standardized Screen Header for the smart-sleeve-app.
 * Ensures consistent branding, spacing, and action button placement.
 */
export function ScreenHeader({
  title,
  badgeLabel,
  leftIcon,
  onLeftPress,
  leftAccessibilityLabel,
  rightIcon,
  onRightPress,
  rightAccessibilityLabel,
  showSettings = true,
}: ScreenHeaderProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const handleLeftPress = onLeftPress || (() => router.push("/modal"));
  const resolvedLeftIcon =
    leftIcon || (showSettings ? "gearshape.fill" : "chevron.left");
  const resolvedLeftLabel =
    leftAccessibilityLabel ||
    (resolvedLeftIcon === "chevron.left" ? "Back" : "Settings");

  const resolvedRightLabel =
    rightAccessibilityLabel ||
    (rightIcon === "square.and.arrow.up"
      ? "Share"
      : rightIcon === "arrow.triangle.2.circlepath"
        ? "Refresh"
        : rightIcon === "bell.fill"
          ? "Notifications"
          : rightIcon === "trophy.fill"
            ? "Achievements"
            : "Action");

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.sideColumn}>
          <TouchableOpacity
            onPress={handleLeftPress}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={resolvedLeftLabel}
          >
            <IconSymbol
              name={resolvedLeftIcon}
              size={24}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.centerColumn}>
          {badgeLabel && (
            <View style={styles.brandBadge}>
              <ThemedText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.brandBadgeText, { color: theme.primary }]}
              >
                {badgeLabel.toUpperCase()}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.sideColumn}>
          {rightIcon ? (
            <TouchableOpacity
              onPress={onRightPress}
              style={[styles.iconButton, { alignItems: "flex-end" }]}
              accessibilityRole="button"
              accessibilityLabel={resolvedRightLabel}
            >
              <IconSymbol
                name={rightIcon}
                size={24}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      {/* Optional Title Below the Top Bar */}
      {title && (
        <ThemedText type="title" style={styles.pageTitle}>
          {title}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    marginBottom: 0,
    width: "100%",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    height: 56,
  },
  sideColumn: {
    width: 48,
    justifyContent: "center",
  },
  centerColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    maxWidth: "100%",
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  pageTitle: {
    marginBottom: 24,
  },
});
