import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

// 🛠️ DEV TOOL: Change this to 'light' or 'dark' to force a theme. Set to null for system default.
const DEBUG_THEME: "light" | "dark" | null = "light";

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (DEBUG_THEME) {
    return DEBUG_THEME;
  }

  if (hasHydrated) {
    return colorScheme;
  }

  return "light";
}
