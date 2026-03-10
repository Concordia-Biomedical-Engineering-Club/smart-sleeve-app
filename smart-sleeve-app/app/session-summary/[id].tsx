import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { ThemedText } from '@/components/themed-text';
import { Colors, Shadows, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Session, getDatabase, fetchEMGSamplesBySession } from '@/services/Database';
import { EXERCISE_LIBRARY } from '@/constants/exercises';
import StatCard from '@/components/StatCard';

const screenWidth = Dimensions.get('window').width;

export default function SessionSummaryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [session, setSession] = useState<Session | null>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const db = await getDatabase();
        
        // Fetch session metadata
        const sessionRow = await db.getFirstAsync<any>(
          `SELECT * FROM sessions WHERE id = ?`,
          [String(id)]
        );

        if (!sessionRow) {
          setIsLoading(false);
          return;
        }

        // Map row to Session object (manually logic from Database.ts mapper)
        const mappedSession: Session = {
          id: sessionRow.id,
          userId: sessionRow.user_id,
          exerciseType: sessionRow.exercise_type,
          side: sessionRow.side,
          timestamp: sessionRow.timestamp,
          duration: sessionRow.duration,
          avgFlexion: sessionRow.avg_flexion,
          exerciseIds: JSON.parse(sessionRow.exercise_ids || '[]'),
          synced: sessionRow.synced === 1,
          analytics: {
            avgActivation: sessionRow.avg_activation,
            maxActivation: sessionRow.max_activation,
            deficitPercentage: sessionRow.deficit_percentage,
            fatigueScore: sessionRow.fatigue_score,
            romDegrees: sessionRow.rom_degrees,
            exerciseQuality: sessionRow.exercise_quality,
          }
        };

        setSession(mappedSession);

        // Fetch EMG samples
        const emgSamples = await fetchEMGSamplesBySession(id as string);
        setSamples(emgSamples);
      } catch (e) {
        console.error("Failed to load session details", e);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadData();
  }, [id]);

  const exerciseInfo = useMemo(() => {
    return EXERCISE_LIBRARY.find(ex => ex.id === session?.exerciseType);
  }, [session?.exerciseType]);

  const handleShare = async () => {
    if (!session) return;
    try {
      await Share.share({
        message: `My Smart Sleeve Workout: ${exerciseInfo?.name || 'General Session'} - Quality: ${Math.round(session.analytics.exerciseQuality * 100)}%, ROM: ${Math.round(session.analytics.romDegrees)}°`,
        title: 'Smart Sleeve Session Summary'
      });
    } catch (error) {
      console.error(error);
    }
  };

  const chartData = useMemo(() => {
    if (samples.length === 0) return null;

    // Downsample for the chart (max 50 points to avoid lag)
    const step = Math.max(1, Math.floor(samples.length / 50));
    const downsampled = samples.filter((_, i) => i % step === 0);

    return {
      labels: [], // No labels for a clean sparkline look
      datasets: [
        {
          data: downsampled.map(s => s.kneeAngle),
          color: (opacity = 1) => theme.primary,
          strokeWidth: 3,
        },
        {
          data: downsampled.map(s => s.vmo_rms * 100), // Scale EMG for visibility
          color: (opacity = 1) => theme.success,
          strokeWidth: 2,
        }
      ],
      legend: ["Knee Angle (°)", "Activation (Rel.)"]
    };
  }, [samples, theme]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ThemedText>Session not found</ThemedText>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={{ color: theme.tint }}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <IconSymbol name="chevron.left" size={28} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={Typography.heading2}>Session Summary</ThemedText>
        <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
          <IconSymbol name="square.and.arrow.up" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO QUALITY CARD */}
        <View style={[styles.heroCard, { backgroundColor: theme.cardBackground }, Shadows.card]}>
          <View style={[styles.qualityRing, { borderColor: theme.success + '22' }]}>
            <ThemedText style={styles.qualityValue}>{Math.round(session.analytics.exerciseQuality * 100)}%</ThemedText>
            <ThemedText style={styles.qualityLabel}>QUALITY</ThemedText>
          </View>
          <View style={styles.heroTextContent}>
            <ThemedText style={styles.exerciseTitle}>{exerciseInfo?.name || 'General Session'}</ThemedText>
            <ThemedText style={styles.sessionDate}>
              {new Date(session.timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </ThemedText>
            <View style={[styles.sideBadge, { backgroundColor: theme.primary + '15' }]}>
              <ThemedText style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>{session.side} LEG</ThemedText>
            </View>
          </View>
        </View>

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={styles.row}>
            <StatCard 
              label="Duration" 
              value={`${Math.floor(session.duration / 60)}m ${session.duration % 60}s`} 
              image={require('@/assets/images/fire.png')}
              imageStyle={{ width: 60, height: 60, bottom: -5, right: -5, opacity: 0.1 }}
            />
            <StatCard 
              label="Max Flexion" 
              value={`${Math.round(session.analytics.romDegrees)}°`} 
              image={require('@/assets/images/trophy.png')}
              imageStyle={{ width: 60, height: 60, bottom: -5, right: -5, opacity: 0.1 }}
            />
          </View>
          <View style={styles.row}>
            <StatCard 
              label="Avg. Activation" 
              value={`${Math.round(session.analytics.avgActivation * 100)}%`} 
              image={require('@/assets/images/target.png')}
              imageStyle={{ width: 60, height: 60, bottom: -5, right: -5, opacity: 0.1 }}
            />
            <StatCard 
              label="Fatigue Score" 
              value={`${Math.round(session.analytics.fatigueScore)}/10`} 
              image={require('@/assets/images/woman.png')}
              imageStyle={{ width: 60, height: 60, bottom: -5, right: -5, opacity: 0.1 }}
            />
          </View>
        </View>

        {/* ACTIVATION GRAPH */}
        <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }, Shadows.card]}>
          <ThemedText style={Typography.heading3}>Session Analytics</ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: 16 }]}>
            Muscle activation vs. Extension angle
          </ThemedText>
          
          {chartData ? (
            <LineChart
              data={chartData}
              width={screenWidth - 72}
              height={220}
              chartConfig={{
                backgroundColor: theme.cardBackground,
                backgroundGradientFrom: theme.cardBackground,
                backgroundGradientTo: theme.cardBackground,
                color: (opacity = 1) => theme.textSecondary,
                labelColor: (opacity = 1) => theme.textSecondary,
                strokeWidth: 2,
                decimalPlaces: 0,
                propsForBackgroundLines: {
                  strokeDasharray: "5, 5",
                  strokeOpacity: 0.1,
                },
              }}
              bezier
              style={styles.chart}
              withVerticalLabels={false}
              withDots={false}
              withInnerLines={false}
            />
          ) : (
            <View style={styles.emptyChart}>
              <ThemedText style={{ color: theme.textSecondary }}>No graph data available</ThemedText>
            </View>
          )}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              <ThemedText style={styles.legendText}>Angle</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.success }]} />
              <ThemedText style={styles.legendText}>Muscle</ThemedText>
            </View>
          </View>
        </View>

        {/* CLINICAL INSIGHTS */}
        <View style={[styles.insightCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
          <View style={styles.insightHeader}>
            <IconSymbol name="lightbulb.fill" size={20} color={theme.primary} />
            <ThemedText style={[styles.insightTitle, { color: theme.primary }]}>Clinician's Insight</ThemedText>
          </View>
          <ThemedText style={styles.insightText}>
            You maintained a consistent quality score of {Math.round(session.analytics.exerciseQuality * 100)}%. 
            {session.analytics.romDegrees < 90 ? " Focus on reaching full extension in your next session to improve ROM." : " Excellent range of motion achieved."}
          </ThemedText>
        </View>

        <TouchableOpacity 
          style={[styles.doneButton, { backgroundColor: theme.tint }]}
          onPress={() => router.push('/(tabs)/dashboard')}
        >
          <ThemedText style={styles.doneButtonText}>Back to Dashboard</ThemedText>
        </TouchableOpacity>
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  heroCard: {
    flexDirection: 'row',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    gap: 20,
  },
  qualityRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  qualityLabel: {
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.5,
  },
  heroTextContent: {
    flex: 1,
    gap: 4,
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sessionDate: {
    fontSize: 14,
    opacity: 0.6,
  },
  sideBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  statsGrid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chartCard: {
    padding: 20,
    borderRadius: 24,
  },
  chart: {
    marginVertical: 8,
    marginLeft: -16,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
  },
  insightCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  doneButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    padding: 12,
  },
});
