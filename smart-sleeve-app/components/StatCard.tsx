import React from "react";
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  StyleSheet,
  ImageStyle,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography, Shadows } from "@/constants/theme";

interface StatCardProps {
  value: string;
  label: string;
  image?: ImageSourcePropType;
  imageStyle?: ImageStyle;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  image,
  imageStyle,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      </View>

      {image && (
        <Image
          source={image}
          style={[styles.image, imageStyle, { tintColor: theme.primary }]}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

export default StatCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24, // Consistent with CircularDataCard
    padding: 20,
    overflow: "hidden",
    justifyContent: "flex-start",
    ...Shadows.card,
    position: "relative",
    minWidth: 140,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)', // Nearly invisible border for hair-line definition
  },
  content: {
    zIndex: 1,
    gap: 4,
  },
  value: {
    ...Typography.heading2,
    fontSize: 22,
  },
  label: {
    ...Typography.label,
    fontSize: 10,
  },
  image: {
    position: "absolute",
    bottom: -10,
    right: -10,
    opacity: 0.1, // Subtle decorative image
    width: 60,
    height: 60,
  },
});
