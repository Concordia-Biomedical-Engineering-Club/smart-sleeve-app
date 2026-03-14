import { auth } from "../firebaseConfig";
import { firebaseConfigError } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";

// Helper function to map Firebase error codes to user-friendly messages
const mapFirebaseError = (error: any): string => {
  console.log("[AuthService] Mapping error:", error);
  const errorString = error?.message || error?.code || JSON.stringify(error) || "";
  const codeMatch = errorString.match(/\(([^)]+)\)/);
  const errorCode = codeMatch ? codeMatch[1] : errorString;

  if (errorCode.includes("invalid-email")) {
    return "Please enter a valid email address.";
  } else if (errorCode.includes("user-not-found") || errorCode.includes("wrong-password") || errorCode.includes("invalid-credential")) {
    return "Email or password is incorrect.";
  } else if (errorCode.includes("email-already-in-use")) {
    return "This email is already registered.";
  } else if (errorCode.includes("weak-password")) {
    return "Password should be at least 6 characters.";
  } else if (errorCode.includes("too-many-requests")) {
    return "Too many attempts. Please try again later.";
  } else if (errorCode.includes("network-request-failed")) {
    return "Network connection failed. Please check your internet.";
  } else if (errorCode.includes("api-key-not-valid") || errorCode.includes("missing-api-key")) {
    return "System Configuration Error: API Key is invalid or missing.";
  }

  if (firebaseConfigError) {
    return `Config Error: ${firebaseConfigError}`;
  }

  return `Auth Error: ${errorCode}`;
};

export { mapFirebaseError };

// Register user
export const register = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  console.log("user credential:", userCredential.user);
  
  // Send verification email after successful registration
  // Wrapped in try/catch so a failure to send doesn't roll back the whole registration process
  try {
    await sendEmailVerification(userCredential.user);
  } catch (emailError) {
    console.warn("[AuthService] Registration succeeded but failed to send verification email:", emailError);
    // We don't throw here because the user is already registered in Firebase.
  }
  
  return userCredential;
};

// Login user
export const login = async (email: string, password: string) => {
  console.log(`[AuthService] Attempting login for: ${email}`);
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("[AuthService] Login successful");
    return result;
  } catch (error) {
    console.error("[AuthService] Login failed:", error);
    throw error;
  }
};

// Logout
export const logout = async () => {
  return await signOut(auth);
};

// Resend verification email
export const resendVerificationEmail = async () => {
  if (auth.currentUser) {
    console.log(auth.currentUser.email);
    await sendEmailVerification(auth.currentUser);
  } else {
    throw new Error("No user is currently signed in");
  }
};

export const sendResetPasswordEmail = async (newEmail: string) => {
  try {
    await sendPasswordResetEmail(auth, newEmail);
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
};
