import React from "react";
import { View, Text, Image, ImageSourcePropType, StyleSheet, ImageStyle, useWindowDimensions } from "react-native";

interface ProfileStatCardProps {
  value: string;
  label: string;
  image: ImageSourcePropType;
  imageStyle?: ImageStyle;
}

const ProfileStatCard: React.FC<ProfileStatCardProps> = ({
  value,
  label,
  image,
  imageStyle,
}) => {
  const { width } = useWindowDimensions();
  
  const isSmallScreen = width < 380;
  const cardWidth = isSmallScreen ? width * 0.42 : 177;
  const cardHeight = isSmallScreen ? width * 0.4 : 167;

  return (
    <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
      <View>
        <Text style={[styles.value, { fontSize: isSmallScreen ? 20 : 24 }]}>{value}</Text>
        <Text style={[styles.label, { fontSize: isSmallScreen ? 11 : 14 }]}>{label}</Text>
      </View>

      <Image source={image} style={[styles.image, imageStyle]} resizeMode="contain" />
    </View>
  );
};

export default ProfileStatCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 15,
    overflow: "hidden",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    position: "relative",
  },
  value: {
    fontWeight: "bold",
    fontFamily: "Lato",
    color: "#000",
  },
  label: {
    color: "#444",
  },
  image: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
});
