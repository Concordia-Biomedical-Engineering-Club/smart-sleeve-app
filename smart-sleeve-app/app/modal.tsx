import { useRouter, Href } from 'expo-router';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    // 1. Dismiss the modal to prevent stacking
    router.back();
    // 2. Safely jump to the strictly typed tab path
    setTimeout(() => {
      router.push(path as Href);
    }, 100);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Settings Menu</ThemedText>
      
      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => handleNavigate('/(tabs)/index')} style={styles.link}>
          <ThemedText type="link">Go to Home (Index)</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleNavigate('/(tabs)/explore')} style={styles.link}>
          <ThemedText type="link">Go to Explore</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleNavigate('/(tabs)/auth')} style={styles.link}>
          <ThemedText type="link">Go to Auth</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleNavigate('/(tabs)/test-ble')} style={styles.link}>
          <ThemedText type="link">Go to Test BLE</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleNavigate('/(tabs)/progress')} style={styles.link}>
          <ThemedText type="link">Go to Progress</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Expo Router modal dismiss feature */}
      <TouchableOpacity onPress={() => router.back()} style={styles.dismissLink}>
        <ThemedText type="link" style={styles.dismissText}>Dismiss</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  linksContainer: {
    gap: 15,
    marginVertical: 20,
    alignItems: 'center',
  },
  link: {
    paddingVertical: 10,
  },
  dismissLink: {
    marginTop: 40,
    alignSelf: 'center',
    paddingVertical: 15,
  },
  dismissText: {
    color: '#FF6B6B',
  },
});
