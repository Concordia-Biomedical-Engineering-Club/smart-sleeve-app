import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography } from '@/constants/theme';

interface SegmentedControlProps {
  options: string[];
  selectedOption: string;
  onSelect: (option: string) => void;
}

export function SegmentedControl({
  options,
  selectedOption,
  onSelect,
}: SegmentedControlProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.secondaryCard, borderColor: theme.border }]}>
      {options.map((option) => {
        const isSelected = option === selectedOption;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
            style={[
              styles.option,
              isSelected && {
                backgroundColor: theme.background,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isSelected ? theme.primary : theme.textSecondary },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...Typography.label,
    fontSize: 12,
    textTransform: 'none',
  },
});
