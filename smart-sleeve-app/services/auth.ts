import { auth } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";

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
  await sendPasswordResetEmail(auth, newEmail);
};
