import React from "react";
import { View, Text, Image, ImageSourcePropType, StyleSheet, ImageStyle, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

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
  
  // Calculate responsive dimensions
  const isSmallScreen = width < 380;
  const cardWidth = isSmallScreen ? width * 0.42 : 177;
  const cardHeight = isSmallScreen ? width * 0.4 : 167;

  return (
    <LinearGradient
        colors={["rgba(255, 255, 255, 0.3)", "rgba(255, 255, 255, 0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 2, borderRadius: 18 }}
        >
        <LinearGradient
            colors={["rgba(81, 232, 241, 0.4)", "rgba(49, 186, 194, 0.3)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, { width: cardWidth, height: cardHeight }]}
        >
            {/* Top-left text */}
            <View>
                <Text style={[styles.value, { fontSize: isSmallScreen ? 20 : 24 }]}>{value}</Text>
                <Text style={[styles.label, { fontSize: isSmallScreen ? 11 : 14 }]}>{label}</Text>
            </View>

            {/* Bottom-right image */}
            <Image source={image} style={[styles.image, imageStyle]} resizeMode="contain" />
        </LinearGradient>
    </LinearGradient>
  );
};

export default ProfileStatCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 15,
    overflow: "hidden",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
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
