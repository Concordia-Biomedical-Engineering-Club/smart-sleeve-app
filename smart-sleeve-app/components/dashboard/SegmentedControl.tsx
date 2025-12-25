import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

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
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = option === selectedOption;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.option,
              isSelected && {
                backgroundColor: theme.tint,
                borderColor: theme.tint,
              },
              !isSelected && {
                backgroundColor: 'transparent',
                borderColor: theme.tint,
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isSelected ? '#FFFFFF' : theme.tint },
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
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
