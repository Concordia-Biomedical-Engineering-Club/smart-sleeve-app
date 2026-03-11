import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { computeSymmetry, WARNING_THRESHOLD } from '@/services/SymmetryService';

interface SymmetryCardProps {
  normalizedPct: number[];
}

export default function SymmetryCard({ normalizedPct }: SymmetryCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  if (!normalizedPct || normalizedPct.length < 4) return null;

  const result = computeSymmetry(normalizedPct);

  const scoreColor = result.symmetryScore >= 80
    ? theme.success
    : result.symmetryScore >= 60
    ? theme.warning
    : '#E63946';

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Symmetry Score</ThemedText>
        {result.hasAnyWarning && (
          <View style={[styles.alertBadge, { backgroundColor: '#E6394620' }]}>
            <ThemedText style={styles.alertText}>⚠️ Deficit &gt;{WARNING_THRESHOLD}%</ThemedText>
          </View>
        )}
      </View>

      {/* Score Circle */}
      <View style={styles.scoreRow}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <ThemedText style={[styles.scoreValue, { color: scoreColor }]}>
            {result.symmetryScore}
          </ThemedText>
          <ThemedText style={[styles.scoreUnit, { color: theme.textSecondary }]}>/ 100</ThemedText>
        </View>

        <View style={styles.insightsCol}>
          <View style={[styles.insightRow, { backgroundColor: theme.background }]}>
            <ThemedText style={[styles.insightLabel, { color: theme.textSecondary }]}>VMO vs VL Balance</ThemedText>
            <ThemedText style={[
              styles.insightValue,
              { color: result.vmoVlBalance > WARNING_THRESHOLD ? '#E63946' : theme.success }
            ]}>
              {result.vmoVlBalance}% gap
            </ThemedText>
          </View>
          <View style={[styles.insightRow, { backgroundColor: theme.background }]}>
            <ThemedText style={[styles.insightLabel, { color: theme.textSecondary }]}>Hamstring Guarding</ThemedText>
            <ThemedText style={[
              styles.insightValue,
              { color: result.hamstringGuarding > 80 ? '#E63946' : theme.success }
            ]}>
              BF: {result.hamstringGuarding}%
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Per-channel breakdown */}
      <View style={styles.channelGrid}>
        {result.channels.map((ch) => (
          <View
            key={ch.channelIndex}
            style={[
              styles.channelChip,
              {
                backgroundColor: ch.hasWarning ? '#E6394615' : theme.background,
                borderColor: ch.hasWarning ? '#E63946' : theme.border,
              }
            ]}
          >
            <ThemedText style={[styles.channelLabel, { color: theme.textSecondary }]}>
              {ch.label}
            </ThemedText>
            <ThemedText style={[
              styles.channelPct,
              { color: ch.hasWarning ? '#E63946' : theme.text }
            ]}>
              {ch.normalizedPct}%
            </ThemedText>
            <ThemedText style={[
              styles.channelDeficit,
              { color: ch.hasWarning ? '#E63946' : theme.textSecondary }
            ]}>
              {ch.hasWarning ? `⚠️ -${ch.deficit}%` : `✓ -${ch.deficit}%`}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 16, fontWeight: '700' },
  alertBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  alertText: { fontSize: 12, color: '#E63946', fontWeight: '600' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreValue: { fontSize: 28, fontWeight: '800' },
  scoreUnit: { fontSize: 11 },
  insightsCol: { flex: 1, gap: 8 },
  insightRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 10, borderRadius: 10,
  },
  insightLabel: { fontSize: 12, flex: 1 },
  insightValue: { fontSize: 12, fontWeight: '700' },
  channelGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  channelChip: {
    width: '47%', borderWidth: 1, borderRadius: 12,
    padding: 12, gap: 4,
  },
  channelLabel: { fontSize: 11, fontWeight: '600' },
  channelPct: { fontSize: 20, fontWeight: '800' },
  channelDeficit: { fontSize: 11 },
});