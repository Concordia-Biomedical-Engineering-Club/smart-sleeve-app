import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const sanitizeEnv = (val: string | undefined) => {
  if (!val) return "";
  // Remove accidental outer quotes or trailing/leading whitespace
  return val.replace(/^["']|["']$/g, "").trim();
};

const EXPO_PUBLIC_FIREBASE_API_KEY = sanitizeEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
const EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = sanitizeEnv(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN);
const EXPO_PUBLIC_FIREBASE_PROJECT_ID = sanitizeEnv(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
const EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = sanitizeEnv(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET);
const EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = sanitizeEnv(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
const EXPO_PUBLIC_FIREBASE_APP_ID = sanitizeEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID);

const hasFirebaseEnv =
  !!EXPO_PUBLIC_FIREBASE_API_KEY &&
  !!EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  !!EXPO_PUBLIC_FIREBASE_PROJECT_ID &&
  !!EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET &&
  !!EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
  !!EXPO_PUBLIC_FIREBASE_APP_ID;

if (!hasFirebaseEnv) {
  console.error(
    "[firebaseConfig] ❌ Missing Firebase environment variables. App will start, but Firebase-backed features will not work until build env values are configured.",
  );
} else {
  console.log("[firebaseConfig] ✅ Firebase environment variables detected.");
  console.log(`[firebaseConfig] Project: ${EXPO_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`[firebaseConfig] App ID: ${EXPO_PUBLIC_FIREBASE_APP_ID.substring(0, 10)}...`);
}

const firebaseConfig = hasFirebaseEnv
  ? {
      apiKey: EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: EXPO_PUBLIC_FIREBASE_APP_ID,
    }
  : {
      apiKey: "missing-api-key",
      authDomain: "missing-auth-domain",
      projectId: "missing-project-id",
      storageBucket: "missing-storage-bucket",
      messagingSenderId: "missing-messaging-sender-id",
      appId: "missing-app-id",
    };

export const firebaseConfigError = hasFirebaseEnv
  ? null
  : "Missing Firebase environment variables. Check your .env file or EAS build environment.";

// Initialize Firebase with hot-reload safety
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Initialize Firebase Auth with platform-specific persistence
 */
let firebaseAuth;
try {
  if (Platform.OS === "web") {
    firebaseAuth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    const { getReactNativePersistence } = require("firebase/auth");
    const ReactNativeAsyncStorage =
      require("@react-native-async-storage/async-storage").default;

    firebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
} catch (error: any) {
  // If already initialized (common during hot reload), use getAuth()
  const { getAuth } = require("firebase/auth");
  firebaseAuth = getAuth(app);
}

export const auth = firebaseAuth;
export const db = getFirestore(app);
