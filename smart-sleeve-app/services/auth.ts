import { auth } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";

// Helper function to map Firebase error codes to user-friendly messages
const mapFirebaseError = (error: any): string => {
  const errorString = error?.message || error?.code || "";
  const codeMatch = errorString.match(/\(([^)]+)\)/);
  const errorCode = codeMatch ? codeMatch[1] : errorString;

  if (errorCode.includes("invalid-email")) {
    return "Please enter a valid email address.";
  } else if (errorCode.includes("user-not-found")) {
    return "Email or password is incorrect.";
  } else if (errorCode.includes("wrong-password")) {
    return "Email or password is incorrect.";
  } else if (errorCode.includes("email-already-in-use")) {
    return "This email is already registered.";
  } else if (errorCode.includes("weak-password")) {
    return "Password should be at least 6 characters.";
  } else if (errorCode.includes("too-many-requests")) {
    return "Too many attempts. Please try again later.";
  }

  return "Authentication failed. Please try again.";
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
  await sendEmailVerification(userCredential.user);
  return userCredential;
};

// Login user
export const login = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
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
