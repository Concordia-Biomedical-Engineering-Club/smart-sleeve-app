import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography } from "@/constants/theme";
import { router } from "expo-router";

export default function ExercisesScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.push("/modal")} style={styles.iconButton}>
          <Image 
            source={require("../../assets/images/settings.png")} 
            style={{ width: 24, height: 24, resizeMode: "contain", tintColor: theme.icon ?? theme.text }} 
          />
        </TouchableOpacity>
        <Text style={[Typography.heading2, { color: theme.text, marginLeft: 10 }]}>Exercises</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={{ color: theme.text }}>Exercises Screen Placeholder</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center"
  }
});
