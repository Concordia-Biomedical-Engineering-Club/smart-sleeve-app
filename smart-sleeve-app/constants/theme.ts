/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const palette = {
  primaryBlue: "#0B74E6",
  textPrimary: "#1A1A1A",
  backgroundLight: "#F8F9FA",
  accentGreen: "#00A878",
  warningRed: "#E63946",
  textSecondary: "#666666",
  white: "#FFFFFF",
};

export const Colors = {
  light: {
    text: palette.textPrimary,
    background: palette.white,
    tint: palette.primaryBlue,
    icon: palette.textSecondary,
    tabIconDefault: palette.textSecondary,
    tabIconSelected: palette.primaryBlue,
    cardBackground: palette.backgroundLight,
    primary: palette.primaryBlue,
    textSecondary: palette.textSecondary,
    textTertiary: "#999999",
    border: "#E1E3E5",
    success: palette.accentGreen,
    warning: palette.warningRed,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: "#fff",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#fff",
    cardBackground: "#1E1E1E",
    primary: palette.primaryBlue,
    textSecondary: "#A1A1A1",
    textTertiary: "#666666",
    border: "#2C2C2C",
    success: palette.accentGreen,
    warning: palette.warningRed,
  },
};

export const Typography = {
  heading1: {
    // fontFamily: 'Inter', // Ensure font is loaded or fallback
    fontWeight: "700" as const,
    fontSize: 32,
    lineHeight: 39,
  },
  heading2: {
    // fontFamily: 'Inter',
    fontWeight: "700" as const,
    fontSize: 24,
    lineHeight: 29,
  },
  heading3: {
    // fontFamily: 'Inter',
    fontWeight: "600" as const,
    fontSize: 18,
    lineHeight: 22,
  },
  body: {
    // fontFamily: 'Inter',
    fontWeight: "400" as const,
    fontSize: 16,
    lineHeight: 19,
  },
  caption: {
    // fontFamily: 'Inter',
    fontWeight: "400" as const,
    fontSize: 14,
    lineHeight: 17,
  },
  label: {
    // fontFamily: 'Inter',
    fontWeight: "500" as const,
    fontSize: 12,
    lineHeight: 15,
  },
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12, // Approximating 24px blur
    elevation: 8,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
