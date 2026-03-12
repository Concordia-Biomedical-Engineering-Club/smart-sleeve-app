import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Shadows, Typography } from '@/constants/theme';

interface CircularDataCardProps {
  title: string;
  currentValue: string;
  goalValue: string;
  percentage: number; // 0 to 100
}

export function CircularDataCard({
  title,
  currentValue,
  goalValue,
  percentage,
}: CircularDataCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Circle Config
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.title, { color: theme.textSecondary, ...Typography.label }]}>{title}</Text>
      
      <View style={styles.contentRow}>
        <View style={styles.chartContainer}>
           <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.border}
              strokeWidth={strokeWidth}
              fill="none"
              strokeOpacity={0.3}
            />
             {/* Foreground Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.success} 
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          
          <View style={styles.internalTextContainer}>
            <Text style={[styles.internalValue, { color: theme.text }]}>{currentValue}</Text>
            <Text style={[styles.internalLabel, { color: theme.textSecondary }]}>{percentage.toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.legendContainer}>
             <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>{goalValue}</Text>
             <View style={[styles.trendBadge, { backgroundColor: theme.success + '15' }]}>
                <Text style={[styles.trendText, { color: theme.success }]}>↑ Progressing</Text>
             </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    ...Shadows.card,
    width: '100%',
  },
  title: {
    marginBottom: 16,
    textAlign: 'left',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  internalTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  internalLabel: {
    ...Typography.caption,
    marginTop: -4,
  },
  internalValue: {
    ...Typography.heading2,
    fontSize: 28,
  },
  legendContainer: {
    flex: 1,
    paddingLeft: 24,
    gap: 8,
  },
  goalLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trendText: {
    ...Typography.label,
    fontSize: 10,
  }
});
