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
import { useAuth } from "../context/authContext";
import { resendVerificationEmail, logout } from "../services/auth";

export default function EmailVerificationScreen() {
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { user, isEmailVerified } = useAuth();

  // If user becomes verified, redirect to tabs
  if (isEmailVerified) {
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
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.projectTitle}>
          Smart Rehabilitation Knee Sleeve
        </Text>
        <Text style={styles.subtitle}>True North Biomedical 2025–2026</Text>
      </View>

      <View style={styles.verificationBox}>
        <Text style={styles.title}>Verify Your Email</Text>

        <Text style={styles.message}>
          We&apos;ve sent a verification email to:
        </Text>
        <Text style={styles.email}>{user?.email}</Text>

        <Text style={styles.instructions}>
          Please check your email and click the verification link to activate
          your account. Once verified, you will be automatically redirected to
          the app.
        </Text>

        <TouchableOpacity
          style={[styles.secondaryButton, resending && styles.buttonDisabled]}
          onPress={handleResendEmail}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color="#00B8A9" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              Resend Verification Email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1D2E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  projectTitle: {
    color: "#E6F4F1",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#6CC5C0",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  verificationBox: {
    width: "100%",
    backgroundColor: "#132E45",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    color: "#C7DDE7",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  email: {
    color: "#00B8A9",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  instructions: {
    color: "#C7DDE7",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#00B8A9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#00B8A9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: "#00B8A9",
    fontWeight: "bold",
    fontSize: 16,
  },
  logoutButton: {
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "600",
  },
});
