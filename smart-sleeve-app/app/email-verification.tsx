import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { resendVerificationEmail, logout } from "../services/auth";
import { RootState } from "../store/store";
import { useSelector } from "react-redux";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography, Shadows } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EmailVerificationScreen() {
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  // If user becomes verified, redirect to tabs
  if (user.isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const handleResendEmail = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      Alert.alert(
        "Email Sent",
        "A new verification email has been sent to your email address."
      );
    } catch {
      Alert.alert(
        "Error",
        "Failed to resend verification email. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      
      <View style={styles.headerContainer}>
        <View style={[styles.brandBadge, { backgroundColor: theme.primary + '15' }]}>
          <ThemedText style={[styles.brandBadgeText, { color: theme.primary }]}>TRUE NORTH BIOMEDICAL</ThemedText>
        </View>
        <ThemedText style={[styles.title, { color: theme.text }]}>Verify Your Email</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Advanced ACL Rehabilitation Monitoring
        </ThemedText>
      </View>

      <View style={[styles.verificationBox, { backgroundColor: theme.cardBackground, ...Shadows.card }]}>
        <ThemedText style={[styles.message, { color: theme.textSecondary }]}>
          We've sent a verification link to:
        </ThemedText>
        <ThemedText type="bodyBold" style={[styles.email, { color: theme.primary }]}>{user?.email}</ThemedText>

        <ThemedText style={[styles.instructions, { color: theme.textSecondary }]}>
          Please check your inbox (and spam folder) and click the link to activate
          your account.
        </ThemedText>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.primary }, resending && { opacity: 0.6 }]}
          onPress={handleResendEmail}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="bodyBold" style={styles.primaryBtnText}>
              Resend Verification Email
            </ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={[styles.logoutText, { color: theme.warning }]}>Use a different email / Logout</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  brandBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 16 },
  brandBadgeText: { ...Typography.label, fontSize: 10 },
  title: { ...Typography.heading1, textAlign: 'center' },
  subtitle: { ...Typography.body, textAlign: 'center', marginTop: 8 },
  verificationBox: { width: '100%', borderRadius: 24, padding: 24 },
  message: { ...Typography.body, textAlign: 'center', marginBottom: 8 },
  email: { textAlign: 'center', fontSize: 18, marginBottom: 20 },
  instructions: { ...Typography.body, textAlign: 'center', marginBottom: 32, lineHeight: 22, fontSize: 15 },
  primaryBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 20 },
  primaryBtnText: { color: '#fff', fontSize: 16 },
  logoutButton: { alignItems: 'center' },
  logoutText: { ...Typography.caption, fontWeight: '600' },
});
