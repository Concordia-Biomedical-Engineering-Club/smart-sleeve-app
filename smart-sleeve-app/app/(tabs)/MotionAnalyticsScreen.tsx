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
import { Colors,Shadows } from "@/constants/theme";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { SegmentedControl } from "@/components/dashboard/SegmentedControl";
import { TrendChart } from "@/components/analytics/TrendChart";

export default function MotionAnalyticsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader 
          badgeLabel="BIOMETRIC ANALYTICS"
          onRightPress={() => console.log("Notification")}
          rightIcon="bell.fill"
        />

        <ThemedText type="title" style={styles.pageTitle}>Motion Patterns</ThemedText>
        
        <View style={styles.selectorWrapper}>
          <SegmentedControl
            options={["Daily", "Weekly", "Monthly"]}
            selectedOption={timeframe}
            onSelect={setTimeframe as any}
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

        <View style={styles.insightsSection}>
           <ThemedText type="label" style={[styles.sectionLabel, { color: theme.textSecondary }]}>KEY INSIGHTS</ThemedText>
           
           <View style={[styles.insightCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, Shadows.card]}>
              <View style={[styles.iconBox, { backgroundColor: theme.success + '15' }]}>
                <IconSymbol name="checkmark.seal.fill" size={20} color={theme.success} />
              </View>
              <View style={styles.insightContent}>
                <ThemedText type="bodyBold" style={{ marginBottom: 4 }}>Improvement Detected</ThemedText>
                <ThemedText style={[styles.insightText, { color: theme.textSecondary }]}>Your flexion has improved by 12% over the last 3 days. Keep the persistence!</ThemedText>
              </View>
           </View>

           <View style={[styles.insightCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, Shadows.card]}>
              <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
                <IconSymbol name="lightbulb.fill" size={20} color={theme.primary} />
              </View>
              <View style={styles.insightContent}>
                <ThemedText type="bodyBold" style={{ marginBottom: 4 }}>Coach Recommendation</ThemedText>
                <ThemedText style={[styles.insightText, { color: theme.textSecondary }]}>Consider adding 2 more sets of Quad Sets to your daily routine to stabilize the joint.</ThemedText>
              </View>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  pageTitle: { marginBottom: 24 },
  selectorWrapper: { marginBottom: 32 },
  chartContainer: { marginBottom: 40 },
  insightsSection: { gap: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  insightCard: { padding: 20, borderRadius: 24, flexDirection: 'row', gap: 16, alignItems: 'flex-start', borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  insightContent: { flex: 1 },
  insightText: { fontSize: 14, lineHeight: 20 },
});
