/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const palette = {
  primaryBlue: "#0B74E6",
  primaryBlueDark: "#0857AD",
  primaryBlueLight: "#3391F0",
  textPrimary: "#1A1B1E", // Slightly softer black
  backgroundLight: "#F8FAFC", // Cleaner light background
  accentGreen: "#00B8A9", // Vibrant medical teal from playbook
  warningRed: "#EF4444",
  textSecondary: "#64748B", // Slate for better legibility
  white: "#FFFFFF",
  glassWhite: "rgba(255, 255, 255, 0.7)",
  glassDark: "rgba(15, 23, 42, 0.7)",
};

export const Colors = {
  light: {
    text: palette.textPrimary,
    background: palette.white,
    tint: palette.primaryBlue,
    icon: palette.textSecondary,
    tabIconDefault: palette.textSecondary,
    tabIconSelected: palette.primaryBlue,
    cardBackground: palette.white,
    secondaryCard: palette.backgroundLight,
    primary: palette.primaryBlue,
    textSecondary: palette.textSecondary,
    textTertiary: "#94A3B8",
    border: "#E2E8F0",
    success: palette.accentGreen,
    warning: palette.warningRed,
    overlay: palette.glassWhite,
  },
  dark: {
    text: "#F8FAFC",
    background: "#0F172A", // Deep slate for premium dark mode
    tint: palette.primaryBlueLight,
    icon: "#64748B",
    tabIconDefault: "#64748B",
    tabIconSelected: palette.white,
    cardBackground: "#1E293B",
    secondaryCard: "#0F172A",
    primary: palette.primaryBlue,
    textSecondary: "#94A3B8",
    textTertiary: "#475569",
    border: "#334155",
    success: palette.accentGreen,
    warning: palette.warningRed,
    overlay: palette.glassDark,
  },
};

export const Typography = {
  heading1: {
    fontWeight: "700" as const,
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heading2: {
    fontWeight: "700" as const,
    fontSize: 24,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  heading3: {
    fontWeight: "600" as const,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontWeight: "400" as const,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: {
    fontWeight: "600" as const,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontWeight: "500" as const,
    fontSize: 14,
    lineHeight: 20,
    color: palette.textSecondary,
  },
  label: {
    fontWeight: "600" as const,
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  button: {
    shadowColor: palette.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "System",
    serif: "Times New Roman",
    rounded: "System",
    mono: "Courier",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
});
