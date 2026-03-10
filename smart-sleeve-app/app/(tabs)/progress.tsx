import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors, Shadows, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchAllSessions, Session } from '@/services/Database';
import { EXERCISE_LIBRARY } from '@/constants/exercises';
import StatCard from '@/components/StatCard';
import { TrendChart } from '@/components/analytics/TrendChart';

const screenWidth = Dimensions.get('window').width;

/**
 * Session Row Item for the history list
 */
function SessionHistoryCard({ session, theme }: { session: Session, theme: any }) {
  const router = useRouter();
  
  const timeStr = useMemo(() => {
    return new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [session.timestamp]);

  const exerciseName = useMemo(() => {
    const ex = EXERCISE_LIBRARY.find(e => e.id === session.exerciseType);
    return ex?.name ?? 'General Session';
  }, [session.exerciseType]);

  const qualityColor = session.analytics.exerciseQuality > 0.8 ? '#00A878' : session.analytics.exerciseQuality > 0.5 ? '#F59E0B' : '#E63946';

  return (
    <TouchableOpacity 
      style={[styles.sessionCard, { backgroundColor: theme.cardBackground }, Shadows.card]}
      activeOpacity={0.7}
      onPress={() => {
        router.push(`/session-summary/${session.id}`);
      }}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTypeInfo}>
          <View style={[styles.sideIndicator, { backgroundColor: session.side === 'LEFT' ? '#0B74E6' : '#7C3AED' }]}>
            <ThemedText style={styles.sideIndicatorText}>{session.side[0]}</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.exerciseNameText}>{exerciseName}</ThemedText>
        </View>
        <ThemedText style={styles.sessionTimeText}>{timeStr}</ThemedText>
      </View>

      <View style={styles.sessionDetails}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>QUALITY</ThemedText>
          <View style={styles.qualityBarBg}>
            <View style={[styles.qualityBarFill, { width: `${session.analytics.exerciseQuality * 100}%`, backgroundColor: qualityColor }]} />
          </View>
        </View>
        
        <View style={styles.metricRow}>
          <View style={styles.miniMetric}>
            <IconSymbol name="timer" size={12} color={theme.textSecondary} />
            <ThemedText style={styles.miniMetricText}>{Math.floor(session.duration / 60)}m {session.duration % 60}s</ThemedText>
          </View>
          <View style={styles.miniMetric}>
            <IconSymbol name="flame.fill" size={12} color={theme.textSecondary} />
            <ThemedText style={styles.miniMetricText}>{session.analytics.romDegrees.toFixed(0)}° ROM</ThemedText>
          </View>
        </View>
      </View>

      <IconSymbol name="chevron.right" size={16} color={theme.border} style={styles.chevron} />
    </TouchableOpacity>
  );
}

export default function ProgressScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    try {
      const data = await fetchAllSessions();
      setSessions(data);
    } catch (e) {
      console.error("Failed to load sessions", e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    sessions.forEach(session => {
      const date = new Date(session.timestamp);
      const today = new Date();
      let dateKey = date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
          dateKey = 'Yesterday';
        }
      }

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(session);
    });
    return groups;
  }, [sessions]);

  const stats = useMemo(() => {
    if (sessions.length === 0) return { avgQuality: 0, totalDuration: 0, maxROM: 0, sessionCount: 0 };
    const totalQuality = sessions.reduce((acc, s) => acc + s.analytics.exerciseQuality, 0);
    const totalDuration = sessions.reduce((acc, s) => acc + s.duration, 0);
    const maxROM = Math.max(...sessions.map(s => s.analytics.romDegrees));
    
    return {
      avgQuality: Math.round((totalQuality / sessions.length) * 100),
      totalDuration: Math.round(totalDuration / 60),
      maxROM: Math.round(maxROM),
      sessionCount: sessions.length
    };
  }, [sessions]);

  const trendData = useMemo(() => {
    if (sessions.length === 0) return null;
    
    // Last 7 days chart data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const labels = last7Days.map(d => d.toLocaleDateString([], { weekday: 'short' }));
    
    const romData = last7Days.map(d => {
      const s = sessions.filter(s => new Date(s.timestamp).toDateString() === d.toDateString());
      if (s.length === 0) return 0;
      return Math.max(...s.map(x => x.analytics.romDegrees));
    });

    const qualityData = last7Days.map(d => {
      const s = sessions.filter(s => new Date(s.timestamp).toDateString() === d.toDateString());
      if (s.length === 0) return 0;
      return (s.reduce((acc, x) => acc + x.analytics.exerciseQuality, 0) / s.length) * 100;
    });

    return {
      labels,
      datasets: [
        {
          data: romData,
          color: () => theme.primary,
          strokeWidth: 2,
        },
        {
          data: qualityData,
          color: () => theme.success,
          strokeWidth: 2,
        },
      ],
      legend: ["ROM (°)", "Quality (%)"],
    };
  }, [sessions, theme.primary, theme.success]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
      >
        <View style={styles.header}>
          <ThemedText style={Typography.heading1}>Progress Log</ThemedText>
          <TouchableOpacity onPress={onRefresh} style={styles.syncButton}>
            <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ANALYTICS SNAPSHOT */}
        <View style={styles.statsContainer}>
          <View style={styles.row}>
            <StatCard 
              label="Quality" 
              value={`${stats.avgQuality}%`} 
              image={require('@/assets/images/target.png')}
              imageStyle={{ width: 60, height: 60, bottom: -5, right: -5, opacity: 0.2 }}
            />
            <StatCard 
              label="Sessions" 
              value={stats.sessionCount.toString()} 
              image={require('@/assets/images/fire.png')}
              imageStyle={{ width: 60, height: 60, bottom: -5, right: -5, opacity: 0.2 }}
            />
          </View>
          <View style={styles.row}>
            <StatCard 
              label="Min Trained" 
              value={stats.totalDuration.toString()} 
              image={require('@/assets/images/woman.png')}
              imageStyle={{ width: 60, height: 60, bottom: -5, right: -5, opacity: 0.2 }}
            />
            <StatCard 
              label="Peak ROM" 
              value={`${stats.maxROM}°`} 
              image={require('@/assets/images/trophy.png')}
              imageStyle={{ width: 60, height: 60, bottom: -5, right: -5, opacity: 0.2 }}
            />
          </View>
        </View>

        {/* TREND CHART */}
        {trendData && (
          <View style={styles.chartWrapper}>
            <TrendChart 
              data={trendData}
              title="Performance Trends"
              subtitle="Comparison of ROM and Quality over last 7 days"
            />
          </View>
        )}

        {/* RECENT ACTIVITY LIST */}
        <View style={styles.historyContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Recent Activity</ThemedText>
          
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="clipboard.fill" size={64} color={theme.border} />
              <ThemedText style={styles.emptyTitle}>No Sessions Yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>Start your first guided exercise on the Dashboard to see your progress here.</ThemedText>
            </View>
          ) : (
            Object.keys(groupedSessions).map(dateKey => (
              <View key={dateKey} style={styles.dateGroup}>
                <ThemedText style={styles.dateHeader}>{dateKey}</ThemedText>
                {groupedSessions[dateKey].map(session => (
                  <SessionHistoryCard key={session.id} session={session} theme={theme} />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  syncButton: {
    padding: 8,
  },
  statsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chartWrapper: {
    marginBottom: 32,
  },
  historyContainer: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 16,
    marginLeft: 4,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  sessionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sideIndicator: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  exerciseNameText: {
    fontSize: 16,
  },
  sessionTimeText: {
    fontSize: 12,
    opacity: 0.5,
  },
  sessionDetails: {
    gap: 12,
  },
  statItem: {
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    opacity: 0.4,
    letterSpacing: 1,
  },
  qualityBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  qualityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 16,
  },
  miniMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniMetricText: {
    fontSize: 12,
    opacity: 0.7,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    opacity: 0.8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.5,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
