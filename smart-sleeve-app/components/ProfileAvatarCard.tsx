import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Shadows } from "@/constants/theme";

import { ThemedText } from "./themed-text";

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
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <View style={styles.container}>
      {/* Avatar Container */}
      <View style={styles.avatarWrapper}>
        <View
          style={[styles.avatarBorder, { borderColor: theme.primary + "20" }]}
        >
          <View style={[styles.innerBorder, { borderColor: theme.primary }]}>
            <Image source={avatar} style={styles.avatar} />
          </View>
        </View>
        {starIcon && (
          <View
            style={[
              styles.badgeContainer,
              { backgroundColor: theme.cardBackground, ...Shadows.card },
            ]}
          >
            <Image source={starIcon} style={styles.starIcon} />
          </View>
        )}
      </View>

      {/* Info Section */}
      <ThemedText type="subtitle" style={styles.name}>
        {name}
      </ThemedText>
      <View
        style={[
          styles.membershipBadge,
          { backgroundColor: theme.primary + "10" },
        ]}
      >
        <ThemedText style={[styles.membership, { color: theme.primary }]}>
          {membership.toUpperCase()}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 8,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 20,
  },
  avatarBorder: {
    padding: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  innerBorder: {
    padding: 4,
    borderRadius: 100,
    borderWidth: 2,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  badgeContainer: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  starIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  name: {
    marginBottom: 8,
  },
  membershipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  membership: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

export default ProfileAvatarCard;
