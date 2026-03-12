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
  rightIcon?: IconSymbolName;
  onRightPress?: () => void;
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
  rightIcon,
  onRightPress,
  showSettings = true,
}: ScreenHeaderProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const handleLeftPress = onLeftPress || (() => router.push("/modal"));

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Left Side: Settings or Custom Icon */}
        <TouchableOpacity
          onPress={handleLeftPress}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <IconSymbol
            name={
              leftIcon || (showSettings ? "gearshape.fill" : "chevron.left")
            }
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        {/* Center: Brand Badge */}
        {badgeLabel && (
          <View style={styles.brandBadge}>
            <ThemedText
              style={[styles.brandBadgeText, { color: theme.primary }]}
            >
              {badgeLabel.toUpperCase()}
            </ThemedText>
          </View>
        )}

        {/* Right Side: Optional Action Icon */}
        <View style={styles.rightContainer}>
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightPress}
              style={styles.iconButton}
              accessibilityRole="button"
            >
              <IconSymbol
                name={rightIcon}
                size={24}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
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
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    height: 48,
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    position: "absolute",
    left: "50%",
    marginLeft: -60, // Rough centering, better to use absolute mapping or flex
    width: 120,
    alignItems: "center",
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  iconButton: {
    padding: 8,
    marginHorizontal: -8, // Compensate for padding to align with edge
  },
  rightContainer: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  pageTitle: {
    marginBottom: 24,
  },
});
