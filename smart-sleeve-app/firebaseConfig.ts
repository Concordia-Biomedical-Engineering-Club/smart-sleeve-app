import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const EXPO_PUBLIC_FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN =
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const EXPO_PUBLIC_FIREBASE_PROJECT_ID =
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID =
  process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const EXPO_PUBLIC_FIREBASE_APP_ID = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

if (
  !EXPO_PUBLIC_FIREBASE_API_KEY ||
  !EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  !EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
  !EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  !EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  !EXPO_PUBLIC_FIREBASE_APP_ID
) {
  // Fail fast when the Expo-provided env vars are missing to avoid silent runtime errors.
  throw new Error(
    "Missing Firebase environment variables. Check your .env file."
  );
}

const firebaseConfig = {
  apiKey: EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with platform-specific persistence
let firebaseAuth;

try {
  if (Platform.OS === 'web') {
    // Web uses browser local storage persistence
    firebaseAuth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    // React Native uses AsyncStorage persistence
    // Dynamic import to avoid web bundle issues
    const { getReactNativePersistence } = require("firebase/auth");
    const ReactNativeAsyncStorage = require("@react-native-async-storage/async-storage").default;
    
    firebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
} catch (error: any) {
  // If auth is already initialized (e.g., during hot reload), use getAuth
  if (error?.code === 'auth/already-initialized') {
    const { getAuth } = require("firebase/auth");
    firebaseAuth = getAuth(app);
  } else {
    throw error;
  }
}

export const auth = firebaseAuth;
export const db = getFirestore(app);
