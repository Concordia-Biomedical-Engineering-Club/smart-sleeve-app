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
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      
      <View style={styles.contentRow}>
        <View style={styles.chartContainer}>
           <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
             {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.border} // Use a subtle color for background
              strokeWidth={strokeWidth}
              fill="none"
            />
             {/* Foreground Circle - Rotated to start from top */}
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
            <Text style={[styles.internalLabel, { color: theme.textSecondary }]}>Goal:</Text>
            <Text style={[styles.internalValue, { color: theme.text }]}>{percentage.toFixed(1)} %</Text>
          </View>
        </View>

        <View style={styles.legendContainer}>
             <Text style={[styles.mainValue, { color: theme.text }]}>{currentValue}</Text>
             <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>{goalValue}</Text>
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
    alignItems: 'center',
  },
  title: {
    ...Typography.heading3,
    marginBottom: 20,
    textAlign: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    gap: 20,
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
      fontSize: 12,
      fontWeight: '500',
  },
  internalValue: {
     fontSize: 18,
     fontWeight: '700',
  },
  legendContainer: {
      alignItems: 'flex-start',
  },
  mainValue: {
      fontSize: 32,
      fontWeight: '700',
  },
  goalLabel: {
      fontSize: 14,
      fontWeight: '400',
  }
});
