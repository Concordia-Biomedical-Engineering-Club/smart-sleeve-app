import { Tabs, Redirect } from "expo-router";
import React, { useEffect } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";

import { useSleeve } from "@/hooks/useSleeve";
import { useSleeveDevice } from "@/hooks/useSleeveDevice";

const USE_MOCK_HARDWARE_ENV_KEY = [
  "EXPO",
  "PUBLIC",
  "USE",
  "MOCK",
  "HARDWARE",
].join("_");

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const user = useSelector((state: RootState) => state.user);

  // Initialize Global BLE Data Flow
  const connector = useSleeve();
  useSleeveDevice(connector);

  // Auto-connect in Mock mode if not connected
  useEffect(() => {
    if (process.env[USE_MOCK_HARDWARE_ENV_KEY] === "true") {
      connector.connect("GLOBAL_MOCK_DEVICE");
    }
  }, [connector]);

  // If user is not verified, redirect to verification screen
  if (user.isLoggedIn && !user.isAuthenticated) {
    return <Redirect href="/email-verification" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarItemStyle: { paddingVertical: 4 }, // Add some vertical padding for cleaner look
      }}
    >
      {/* Visible Tabs */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.bar.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="exercises"
        options={{
          title: "Exercises",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.run" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="MotionAnalyticsScreen"
        options={{
          title: "Motion",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="waveform.path.ecg" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="MilestonesScreen"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="person.crop.circle.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="chart.line.uptrend.xyaxis"
              color={color}
            />
          ),
        }}
      />

      {/* Hidden Screens inside (tabs) */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="test-ble"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="debug-db"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
