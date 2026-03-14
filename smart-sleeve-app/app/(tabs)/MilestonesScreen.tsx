import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import StatCard from "../../components/StatCard";
import ProfileAvatarCard from "../../components/ProfileAvatarCard";
import MilestoneListItem from "../../components/MilestoneListItem";
import { Colors } from "@/constants/theme";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { Link } from "expo-router";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { fetchSessionsByFilters, Session } from "@/services/Database";
import { computeCompletionRate } from "@/services/ProgressAnalysis";

// Base Milestone templates
const BASE_MILESTONES = [
  {
    id: "1",
    title: "First Full Extension (100°+ ROM)",
    reqRom: 100,
  },
  {
    id: "2",
    title: "First 10 Exercises",
    reqCount: 10,
  },
  {
    id: "3",
    title: "50 Exercises",
    reqCount: 50,
  },
];


export default function MilestonesScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const user = useSelector((state: RootState) => state.user);

  const [stats, setStats] = useState({
    sessionCount: 0,
    compliance: 0,
    streak: 0,
    milestonesUnlocked: 0,
  });

  const [milestones, setMilestones] = useState<any[]>(BASE_MILESTONES.map(m => ({
    ...m,
    unlocked: false,
    achievedDate: undefined,
    icon: require("../../assets/images/trophy.png"),
  })));

  useEffect(() => {
    const loadStats = async () => {
      try {
        const userId = user.uid ?? user.email ?? "guest_user";
        const sessions = await fetchSessionsByFilters({ userId });

        const sessionCount = sessions.length;

        // Compliance
        let compliance = 0;
        if (sessionCount > 0) {
          const totalCompletion = sessions.reduce(
            (sum, s) => sum + computeCompletionRate(s),
            0,
          );
          compliance = Math.round(totalCompletion / sessionCount);
        }

        // Extremely basic streak (unique days)
        const uniqueDays = new Set(
          sessions.map((s) => new Date(s.timestamp).toDateString())
        ).size;
        const streak = uniqueDays;

        // Evaluate Milestones
        let unlockedCount = 0;
        const evaluatedMilestones = BASE_MILESTONES.map((bm) => {
          let unlocked = false;
          let dateStr = "";

          if (bm.reqRom) {
            const firstWithRom = sessions.find((s) => s.analytics.romDegrees >= bm.reqRom);
            if (firstWithRom) {
              unlocked = true;
              dateStr = new Date(firstWithRom.timestamp).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
            }
          } else if (bm.reqCount) {
             if (sessionCount >= bm.reqCount) {
               unlocked = true;
               // Date of the Nth session
               if (sessions.length >= bm.reqCount) {
                 // sessions are usually sorted descending by fetchSessionsByFilters, so flip logic to find the specific Nth if needed
                 // for simplicity just use most recent one's date or the first one that triggered it
                 dateStr = new Date(sessions[sessions.length - bm.reqCount].timestamp).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
               }
             }
          }

          if (unlocked) unlockedCount++;

          return {
            ...bm,
            unlocked,
            achievedDate: unlocked ? dateStr : undefined,
            icon: require("../../assets/images/trophy.png"),
          };
        });

        setStats({
          sessionCount,
          compliance,
          streak,
          milestonesUnlocked: unlockedCount,
        });
        setMilestones(evaluatedMilestones);
      } catch (error) {
        console.error("Failed to load milestone stats:", error);
      }
    };

    loadStats();
  }, [user.uid, user.email]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <ScreenHeader badgeLabel="PLAYER PROFILE" rightIcon="trophy.fill" />

      <ProfileAvatarCard
        name={user.email?.split("@")[0] || "Player One"}
        membership="Premium Athlete"
        avatar={require("../../assets/images/avatar.png")}
        starIcon={require("../../assets/images/star.png")}
      />

      <View style={styles.statsContainer}>
        <View style={styles.row}>
          <StatCard value={`${stats.milestonesUnlocked}/${BASE_MILESTONES.length}`} label="Milestones" />
          <StatCard value={`${stats.streak} Days`} label="Active Days" />
        </View>

        <View style={styles.row}>
          <StatCard value={stats.sessionCount.toString()} label="Exercises" />
          <StatCard value={`${stats.compliance}%`} label="Compliance" />
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <ThemedText
          type="label"
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          {stats.sessionCount > 0 ? "RECENT ACHIEVEMENTS" : "RECOVERY MILESTONES"}
        </ThemedText>
        {stats.sessionCount > 0 && (
          <View style={styles.pill}>
            <ThemedText style={[styles.pillText, { color: theme.primary }]}>
              ALL
            </ThemedText>
          </View>
        )}
      </View>
      
      {stats.sessionCount === 0 && (
        <View style={[styles.emptyState, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <IconSymbol name="chart.bar.fill" size={32} color={theme.textSecondary} />
          <ThemedText type="bodyBold" style={styles.emptyTitle}>Your Journey Starts Here</ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            Complete your first exercise to begin tracking ROM, muscle balance, and surgical recovery milestones.
          </ThemedText>
          <TouchableOpacity 
             style={[styles.seedBtn, { backgroundColor: theme.primary }]}
             onPress={() => Alert.alert("Demo Mode", "Use the 'Demo Tools' at the bottom to seed 45 days of recovery data for judges.")}
          >
            <ThemedText style={styles.seedBtnText}>LEARN ABOUT MILESTONES</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={milestones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MilestoneListItem
            title={item.title}
            achievedDate={item.achievedDate}
            unlocked={item.unlocked}
            icon={item.icon}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <Link href="/debug-db" asChild>
              <TouchableOpacity style={styles.demoBtn}>
                <ThemedText style={styles.demoBtnText}>🛠 DEMO TOOLS</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 24, paddingBottom: 40 },
  headerContainer: { marginBottom: 32 },
  statsContainer: { gap: 16, marginBottom: 40 },
  row: { flexDirection: "row", gap: 16 },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  pillText: { fontSize: 10, fontWeight: "800" },
  footer: { marginTop: 40, alignItems: "center" },
  demoBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 12, 
    backgroundColor: "rgba(131, 56, 236, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(131, 56, 236, 0.2)"
  },
  demoBtnText: { color: "#8338ec", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  emptyState: { 
    padding: 32, 
    borderRadius: 20, 
    alignItems: "center", 
    borderWidth: 1, 
    borderStyle: "dashed" 
  },
  emptyTitle: { marginTop: 16, marginBottom: 8 },
  emptyText: { textAlign: "center", marginBottom: 24, fontSize: 13, lineHeight: 20 },
  seedBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  seedBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
