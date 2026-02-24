import { Tabs, Redirect } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const user = useSelector((state: RootState) => state.user);

  // If user is not verified, redirect to verification screen
  if (user.isLoggedIn && !user.isAuthenticated) {
    return <Redirect href="/email-verification" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
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
          title: "Milestones",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="trophy.fill" color={color} />
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
        name="auth"
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
        name="progress"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
