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
        <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
      </View>

      {image && (
        <Image
          source={image}
          style={[styles.image, imageStyle]}
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
    aspectRatio: 1.05,
    borderRadius: 20,
    padding: 15,
    overflow: "hidden",
    justifyContent: "space-between",
    ...Shadows.card,
    position: "relative",
    minWidth: 140,
  },
  content: {
    zIndex: 1,
  },
  value: {
    ...Typography.heading2,
  },
  label: {
    ...Typography.caption,
    marginTop: 4,
  },
  image: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
});
