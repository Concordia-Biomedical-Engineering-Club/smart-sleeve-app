import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/themed-text';
import { Colors, Typography, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RootState } from '@/store/store';
import { logout as firebaseLogout } from '@/services/auth';
import { logout } from '@/store/userSlice';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';

export default function SettingsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const handleLogout = async () => {
    try {
      await firebaseLogout();
      dispatch(logout());
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigate = (path: string) => {
    // Always dismiss the modal first to prevent "stacking" overlays
    // when moving to main app screens or debug tools.
    if (router.canGoBack()) {
      router.back();
    }
    
    // Delay slightly to ensure the modal dismissal animation starts
    // before we trigger the next navigation.
    setTimeout(() => {
      router.push(path as Href);
    }, 150);
  };

  const SettingItem = ({ 
    icon, 
    label, 
    onPress, 
    color = theme.textSecondary,
    destructive = false 
  }: { 
    icon: IconSymbolName; 
    label: string; 
    onPress: () => void;
    color?: string;
    destructive?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: theme.border }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: destructive ? theme.warning + '15' : theme.primary + '10' }]}>
        <IconSymbol name={icon} size={20} color={destructive ? theme.warning : theme.primary} />
      </View>
      <ThemedText style={[styles.settingLabel, { color: destructive ? theme.warning : theme.text }]}>
        {label}
      </ThemedText>
      <IconSymbol name="chevron.right" size={16} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>Done</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.cardBackground, ...Shadows.card }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
            <IconSymbol name="person.fill" size={32} color={theme.primary} />
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="bodyBold" style={{ fontSize: 18 }}>{user.email?.split('@')[0] || 'Athlete'}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>{user.email}</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</ThemedText>
          <View style={[styles.settingsGroup, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SettingItem icon="person.fill" label="Personal Information" onPress={() => {}} />
            <SettingItem icon="bell.fill" label="Notifications" onPress={() => {}} />
            <SettingItem icon="lock.fill" label="Privacy & Security" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPPORT</ThemedText>
          <View style={[styles.settingsGroup, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SettingItem icon="questionmark.circle.fill" label="Help Center" onPress={() => {}} />
            <SettingItem icon="clipboard.fill" label="About True North" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>DIAGNOSTICS & TOOLS</ThemedText>
          <View style={[styles.settingsGroup, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SettingItem icon="antenna.radiowaves.left.and.right" label="Test BLE Connectivity" onPress={() => handleNavigate('/(tabs)/test-ble')} />
            <SettingItem icon="paperplane.fill" label="Explore Components" onPress={() => handleNavigate('/(tabs)/explore')} />
            <SettingItem icon="cylinder.split.1x2" label="Database Debug" onPress={() => handleNavigate('/debug-db')} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={[styles.logoutIconContainer, { backgroundColor: theme.warning + '15' }]}>
            <IconSymbol name="arrow.left.square.fill" size={20} color={theme.warning} />
          </View>
          <ThemedText style={[styles.logoutText, { color: theme.warning }]}>Sign Out</ThemedText>
        </TouchableOpacity>

        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: theme.textTertiary }]}>True North Biomedical v1.0.4</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    position: 'relative',
  },
  headerTitle: { ...Typography.heading3, fontSize: 18 },
  closeButton: { position: 'absolute', right: 24, top: Platform.OS === 'ios' ? 60 : 40 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { marginLeft: 16, flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { ...Typography.label, fontSize: 11, marginBottom: 12, marginLeft: 4 },
  settingsGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 16,
    gap: 12,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: { fontSize: 16, fontWeight: '700' },
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 12, fontWeight: '600' },
});
