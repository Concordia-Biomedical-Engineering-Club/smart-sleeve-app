import React from "react";
import { View, StyleSheet } from "react-native";
import ProfileStatCard from "../../components/ProfileStatCard";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ProfileStatCard
          {...({
            value: "3/10",
            label: "Milestones",
            image: require("../../assets/images/trophy.png"),
            imageStyle: { width: 72, height: 84, position: "absolute", bottom: 10, right: 10},
          } as any)}
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
          value="94 %"
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    justifyContent: "center",
    gap: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 12,
  },
});
