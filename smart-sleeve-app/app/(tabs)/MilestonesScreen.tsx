import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Text } from "react-native";
import ProfileStatCard from "../../components/ProfileStatCard";
import ProfileAvatarCard from "../../components/ProfileAvatarCard";
import MilestoneListItem from "../../components/MilestoneListItem";

export default function ProfileScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity>
          <Image source={require("../../assets/images/settings.png")} style={styles.icon} />
        </TouchableOpacity>

        <TouchableOpacity>
          <Image source={require("../../assets/images/notification.png")} style={styles.icon} />
        </TouchableOpacity>
      </View>

      {/* Profile Avatar Section */}
      <ProfileAvatarCard
        name="Emily"
        membership="Premium Member"
        avatar={require("../../assets/images/avatar.png")}
        starIcon={require("../../assets/images/star.png")}
      />

      {/* Stats Section */}
      <View style={styles.row}>
        <ProfileStatCard
          value="3/10"
          label="Milestones"
          image={require("../../assets/images/trophy.png")}
          imageStyle={{
            width: 72,
            height: 84,
            position: "absolute",
            bottom: 10,
            right: 10,
          }}
        />

        <ProfileStatCard
          value="12 Days"
          label="Current Streak"
          image={require("../../assets/images/fire.png")}
          imageStyle={{
            width: 162,
            height: 162,
            bottom: -20,
            right: -25,
          }}
        />
      </View>

      <View style={styles.row}>
        <ProfileStatCard
          value="132"
          label="Exercises"
          image={require("../../assets/images/target.png")}
          imageStyle={{
            width: 89,
            height: 100,
            bottom: 5,
            right: 5,
          }}
        />

        <ProfileStatCard
          value="94%"
          label={"Average\nCompliance"}
          image={require("../../assets/images/woman.png")}
          imageStyle={{
            width: 162,
            height: 162,
            bottom: -20,
            right: -25,
          }}
        />
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 25, fontWeight: "700", marginBottom: 20, textAlign: "center" }}>
          Your Milestones
        </Text>

        <MilestoneListItem
          title="First Full Extension"
          achievedDate="Oct 28, 2025"
          unlocked={true}
          icon={require("../../assets/images/trophy.png")}
        />

        <MilestoneListItem
          title="First Full Extension"
          achievedDate="Oct 28, 2025"
          unlocked={true}
          icon={require("../../assets/images/trophy.png")}
        />

        <MilestoneListItem
          title="First Full Extension"
          unlocked={false}
          icon={require("../../assets/images/trophy.png")}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 12,
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
});
