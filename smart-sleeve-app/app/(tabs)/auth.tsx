import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { login, signup, logout } from "../../store/userSlice";
import { RootState } from "../../store/store";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Typography, Shadows } from "@/constants/theme";
import {
  login as firebaseLogin,
  register as firebaseRegister,
  logout as firebaseLogout,
  sendResetPasswordEmail,
  mapFirebaseError,
} from "../../services/auth";
import { StatusBar } from "expo-status-bar";
import { AppModal } from "@/components/ui/AppModal";

export default function AuthScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      setEmail("");
      setPassword("");
      setRetypePassword("");
      setError("");
    }, []),
  );

  const handleAuth = async () => {
    setError("");
    if (!isLogin && password !== retypePassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("Request taking too long. Please try again.");
    }, 10000);

    try {
      if (isLogin) {
        const userCredential = await firebaseLogin(email, password);
        const user = userCredential.user;
        if (user.emailVerified) {
          dispatch(login({ email: user.email, isAuthenticated: true }));
          router.push("/");
        } else {
          dispatch(login({ email: user.email, isAuthenticated: false }));
          router.push("/email-verification");
        }
      } else {
        const userCredential = await firebaseRegister(email, password);
        const user = userCredential.user;
        dispatch(signup({ email: user.email, isAuthenticated: false }));
        router.push("/email-verification");
      }
    } catch (e) {
      setError(mapFirebaseError(e));
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseLogout();
      dispatch(logout());
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handlePasswordReset = async () => {
    setResetMessage("");
    setError("");

    if (!resetEmail) {
      setError("Please enter your email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError(
        "Request taking too long. Please check your connection and try again.",
      );
    }, 10000);

    try {
      await sendResetPasswordEmail(resetEmail);
      setResetMessage("Password reset email sent! Check your inbox.");
      setResetEmail("");
    } catch (resetError) {
      setError((resetError as Error).message || "Failed to send reset email.");
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const toggleAuth = () => {
    setIsLogin(!isLogin);
    setError("");
  };

  if (user.isLoggedIn) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>Hello again!</Text>
        <Text
          style={[
            styles.subtitle,
            { color: theme.textSecondary, marginBottom: 24 },
          ]}
        >
          {user.email}
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.primary, width: "80%" },
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <View
            style={[
              styles.brandBadge,
              { backgroundColor: theme.primary + "15" },
            ]}
          >
            <Text style={[styles.brandBadgeText, { color: theme.primary }]}>
              TRUE NORTH BIOMEDICAL
            </Text>
          </View>
          <Text style={[styles.projectTitle, { color: theme.text }]}>
            Knee Companion
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Advanced ACL Rehabilitation Monitoring
          </Text>
        </View>

        <View
          style={[
            styles.authBox,
            { backgroundColor: theme.cardBackground, ...Shadows.card },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {isLogin ? "Welcome Back" : "Get Started"}
          </Text>

          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                EMAIL
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.secondaryCard,
                  },
                ]}
                placeholder="athlete@example.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                PASSWORD
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.secondaryCard,
                  },
                ]}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {!isLogin && (
              <View style={styles.inputWrapper}>
                <Text
                  style={[styles.inputLabel, { color: theme.textSecondary }]}
                >
                  CONFIRM PASSWORD
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.secondaryCard,
                    },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textTertiary}
                  value={retypePassword}
                  onChangeText={setRetypePassword}
                  secureTextEntry
                />
              </View>
            )}

            {isLogin && (
              <TouchableOpacity
                onPress={() => setShowResetModal(true)}
                style={styles.forgotPasswordContainer}
              >
                <Text style={[styles.forgotPassword, { color: theme.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleAuth} style={styles.switchContainer}>
            <Text style={[styles.switch, { color: theme.textSecondary }]}>
              {isLogin
                ? "New to Knee Companion? "
                : "Already have an account? "}
              <Text style={[styles.switchHighlight, { color: theme.primary }]}>
                {isLogin ? "Register" : "Login"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AppModal
        visible={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetMessage("");
          setError("");
        }}
        title="Reset Password"
        subtitle="Enter your email to receive a password reset link."
        footer={
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.primary, marginTop: 0 },
            ]}
            onPress={handlePasswordReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Link</Text>
            )}
          </TouchableOpacity>
        }
      >
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.secondaryCard,
            },
          ]}
          placeholder="athlete@example.com"
          placeholderTextColor={theme.textTertiary}
          value={resetEmail}
          onChangeText={setResetEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {resetMessage ? (
          <Text style={styles.success}>{resetMessage}</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </AppModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  brandBadgeText: {
    ...Typography.label,
    fontSize: 10,
  },
  projectTitle: {
    ...Typography.heading1,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.body,
    textAlign: "center",
    marginTop: 8,
    maxWidth: "80%",
  },
  authBox: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
  },
  formContainer: {
    width: "100%",
    gap: 16,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    ...Typography.label,
    fontSize: 10,
    marginLeft: 4,
  },
  title: {
    ...Typography.heading2,
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    ...Typography.body,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    ...Typography.caption,
    color: "#FF6B6B",
    marginTop: 12,
    textAlign: "center",
  },
  success: {
    ...Typography.caption,
    color: "#00A878",
    textAlign: "center",
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
  },
  forgotPassword: {
    ...Typography.caption,
    fontWeight: "600",
  },
  switchContainer: {
    marginTop: 24,
  },
  switch: {
    textAlign: "center",
    ...Typography.body,
    fontSize: 14,
  },
  switchHighlight: {
    fontWeight: "700",
  },
  modalBox: {},
  modalTitle: {},
});
