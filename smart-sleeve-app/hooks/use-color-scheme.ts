import { useColorScheme as _useColorScheme } from "react-native";

// 🛠️ DEV TOOL: Change this to 'light' or 'dark' to force a theme. Set to null for system default.
const DEBUG_THEME: "light" | "dark" | null = "light";

export function useColorScheme() {
  const systemTheme = _useColorScheme();

  if (DEBUG_THEME) {
    return DEBUG_THEME;
  }

  return systemTheme;
}
