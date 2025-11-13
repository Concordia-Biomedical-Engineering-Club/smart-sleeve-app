import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

interface ProfileAvatarCardProps {
  name: string;
  membership: string;
  avatar: any;
  starIcon?: any;
}

const ProfileAvatarCard: React.FC<ProfileAvatarCardProps> = ({
  name,
  membership,
  avatar,
  starIcon,
}) => {
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarBorder}>
          <Image source={avatar} style={styles.avatar} />
        </View>
        {starIcon && <Image source={starIcon} style={styles.starIcon} />}
      </View>

      {/* Info */}
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.membership}>{membership}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 24,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  icon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  avatarContainer: {
    marginTop: 60,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBorder: {
    borderWidth: 3,
    borderColor: "#73CFD4",
    borderRadius: 150,
    padding: 10,
  },
  avatar: {
    width: 274,
    height: 274,
    borderRadius: 60,
  },
  starIcon: {
    position: "absolute",
    bottom: 5,
    right: 45,
    width: 63,
    height: 60,
    resizeMode: "contain",
  },
  name: {
    fontSize: 30,
    fontWeight: "600",
    color: "#222",
    marginTop: 10,
  },
  membership: {
    fontSize: 14,
    color: "#888",
  },
});

export default ProfileAvatarCard;
