import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography } from "@/constants/theme";

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
  const { width } = useWindowDimensions();

  // Calculate avatar size based on screen width, maxing out at 274
  const avatarSize = Math.min(width * 0.6, 274);

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={[styles.avatarBorder, { borderColor: theme.primary }]}>
          <Image
            source={avatar}
            style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
          />
        </View>
        {starIcon && <Image source={starIcon} style={styles.starIcon} />}
      </View>

      {/* Info */}
      <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
      <Text style={[styles.membership, { color: theme.textSecondary }]}>
        {membership}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    marginTop: 20,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBorder: {
    borderWidth: 3,
    borderRadius: 150,
    padding: 10,
  },
  avatar: {
    borderRadius: 150,
  },
  starIcon: {
    position: "absolute",
    bottom: 5,
    right: 10,
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  name: {
    ...Typography.heading1,
    marginTop: 10,
  },
  membership: {
    ...Typography.caption,
  },
});

export default ProfileAvatarCard;
