import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { login, signup, logout } from "../../store/userSlice";
import { RootState } from "../../store/store";
import {
  login as firebaseLogin,
  register as firebaseRegister,
  logout as firebaseLogout,
  sendResetPasswordEmail,
  mapFirebaseError,
} from "../../services/auth";

export default function AuthScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // Clear inputs when screen is focused
  useFocusEffect(
    useCallback(() => {
      setEmail("");
      setPassword("");
      setRetypePassword("");
      setError("");
    }, [])
  );

  const handleAuth = async () => {
    setError("");
    if (!isLogin && password !== retypePassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
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
      const message = mapFirebaseError(e);
      setError(message);
    } finally {
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

    // Validate email is not empty
    if (!resetEmail) {
      setError("Please enter your email.");
      return;
    }

    // Validate email format before sending to Firebase
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await sendResetPasswordEmail(resetEmail);
      setResetMessage("Password reset email sent! Check your inbox.");
      setResetEmail(""); // Clear email field after success
    } catch (error) {
      const errorMessage =
        (error as Error).message || "Failed to send reset email.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuth = () => {
    setIsLogin(!isLogin);
    setEmail("");
    setPassword("");
    setRetypePassword("");
    setError("");
  };

  // If already logged in
  if (user.isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You are logged in as {user.email}</Text>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Default login/register screen
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.projectTitle}>
          Smart Rehabilitation Knee Sleeve
        </Text>
        <Text style={styles.subtitle}>True North Biomedical 2025–2026</Text>
      </View>

      <View style={styles.authBox}>
        <Text style={styles.title}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {isLogin && (
            <TouchableOpacity onPress={() => setShowResetModal(true)}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Retype Password"
              placeholderTextColor="#aaa"
              value={retypePassword}
              onChangeText={setRetypePassword}
              secureTextEntry
            />
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? "Login" : "Register"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleAuth}>
          <Text style={styles.switch}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Text style={styles.switchHighlight}>
              {isLogin ? "Register" : "Login"}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- Password Reset Modal --- */}
      <Modal visible={showResetModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#aaa"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {resetMessage ? (
              <Text style={styles.success}>{resetMessage}</Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={styles.button}
              onPress={handlePasswordReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowResetModal(false)}>
              <Text style={styles.switchHighlight}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  authBox: {
    width: "100%",
    backgroundColor: "#132E45",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  formContainer: {
    width: "100%",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1E3B57",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2C5A77",
  },
  button: {
    backgroundColor: "#00B8A9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  error: {
    color: "#FF6B6B",
    marginBottom: 8,
    textAlign: "center",
  },
  success: {
    color: "#6CC5C0",
    marginBottom: 8,
    textAlign: "center",
  },
  forgotPassword: {
    color: "#00B8A9",
    marginBottom: 12,
    textAlign: "right",
  },
  switch: {
    color: "#C7DDE7",
    marginTop: 16,
    textAlign: "center",
  },
  switchHighlight: {
    color: "#00B8A9",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    backgroundColor: "#132E45",
    borderRadius: 16,
    padding: 24,
    width: "85%",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
});
