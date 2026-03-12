import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { TrendChart } from "@/components/analytics/TrendChart";

export default function MotionAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [timeframe, setTimeframe] = useState("Weekly");

  // Mock data for the chart
  const mockData = {
    labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [
      {
        data: [60, 62, 68, 67, 63, 70, 75], // Flexion
        color: () => theme.primary,
        strokeWidth: 3,
      },
      {
        data: [20, 35, 45, 58, 42, 48, 52], // Extension
        color: () => theme.success,
        strokeWidth: 3,
      },
    ],
    legend: ["Flexion", "Extension"],
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.push("/modal")} style={styles.iconButton}>
             <IconSymbol name="gearshape.fill" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={styles.brandBadge}>
             <ThemedText style={[styles.brandBadgeText, { color: theme.primary }]}>BIOMETRIC ANALYTICS</ThemedText>
          </View>
          <TouchableOpacity onPress={() => console.log("Notification")} style={styles.iconButton}>
            <IconSymbol name="bell.fill" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.pageTitle}>Motion Patterns</ThemedText>
        
        <View style={styles.selectorWrapper}>
          <SegmentedControl
            options={["Daily", "Weekly", "Monthly"]}
            selectedOption={timeframe}
            onSelect={setTimeframe}
          />
        </View>

        <View style={styles.chartContainer}>
          <TrendChart 
            data={mockData}
            title="Range of Motion"
            subtitle={`Active flexion/extension trend for this ${timeframe.toLowerCase()}`}
            height={280}
          />
        </View>

        <View style={styles.insightsGrid}>
           <ThemedText type="label" style={styles.sectionLabel}>Key Insights</ThemedText>
           <View style={[styles.insightCard, { backgroundColor: theme.secondaryCard }]}>
              <IconSymbol name="checkmark.seal.fill" size={20} color={theme.success} />
              <ThemedText style={styles.insightText}>Your flexion has improved by 12% over the last 3 days. Keep the persistence!</ThemedText>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  headerContainer: { paddingHorizontal: 24, paddingVertical: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' },
  brandBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  iconButton: { padding: 8 },
  pageTitle: { marginBottom: 24 },
  selectorWrapper: { marginBottom: 32 },
  chartContainer: { marginBottom: 32 },
  insightsGrid: { gap: 16 },
  sectionLabel: { color: "#64748B", marginBottom: 8 },
  insightCard: { padding: 20, borderRadius: 20, flexDirection: 'row', gap: 16, alignItems: 'center' },
  insightText: { flex: 1, fontSize: 14, lineHeight: 20, opacity: 0.8 },
});
