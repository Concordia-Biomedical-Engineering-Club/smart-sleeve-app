import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Provider, useSelector } from "react-redux";
import { store, persistor } from "../store/store";
import { PersistGate } from "redux-persist/integration/react";
import { onAuthStateChanged } from "firebase/auth";
import { login, logout } from "../store/userSlice";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { initDatabase } from "@/services/Database";
import type { RootState } from "@/store/store";
import { auth } from "@/firebaseConfig";
import { syncNow } from "@/services/SyncService";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppNavigator({
  colorScheme,
}: {
  colorScheme: string | null | undefined;
}) {
  const hasCompletedOnboarding = useSelector(
    (state: RootState) => state.user.hasCompletedOnboarding,
  );
  const isLoggedIn = useSelector((state: RootState) => state.user.isLoggedIn);
  const injuredSide = useSelector((state: RootState) => state.user.injuredSide);
  const segments = useSegments();

  useEffect(() => {
    const inOnboarding = segments[0] === "onboarding";
    const inAuth = segments[0] === "(auth)";
    const inVerification = segments[0] === "email-verification";

    // Auth Guard
    if (!isLoggedIn && !inAuth) {
      router.replace("/(auth)/login" as any);
      return;
    }

    // Onboarding Guard
    if (isLoggedIn && (!hasCompletedOnboarding || !injuredSide)) {
      if (!inOnboarding && !inVerification) {
        router.replace("/onboarding" as any);
      }
    }
  }, [isLoggedIn, hasCompletedOnboarding, injuredSide, segments]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="debug-db" options={{ title: "Database Debug" }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen
          name="email-verification"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="session-summary/[id]"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        store.dispatch(
          login({
            email: user.email,
            isAuthenticated: user.emailVerified,
            uid: user.uid,
          }),
        );
        // Trigger a download/sync on login to recover any sessions from the cloud
        if (user.emailVerified) {
          try {
            await initDatabase();
            // Pass UID as canonical key, and email as legacy fallback for migration
            await syncNow(user.uid, user.email);
          } catch (error) {
            console.error("[RootLayout] Sync initialization failed:", error);
          }
        }
      } else {
        store.dispatch(logout());
      }
    });

    initDatabase().catch(console.error);

    return unsubscribe;
  }, []);

  // Guarded Reconnect Auto-Flush
  const lastSyncAttempt = useRef<number>(0);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      // 1. Must be connected to the internet
      if (!state.isConnected) return;

      // 2. Must be in the foreground
      if (AppState.currentState !== "active") return;

      // 3. Must have an authenticated user
      const user = auth.currentUser;
      if (!user || !user.emailVerified) return;

      // 4. Time-based throttle (e.g. 30 seconds) to prevent spamming on unstable networks
      const now = Date.now();
      if (now - lastSyncAttempt.current < 30000) return;

      lastSyncAttempt.current = now;
      console.log(
        "[RootLayout] Network restored. Triggering offline queue flush...",
      );

      // The SyncService _isSyncing mutex naturally protects against overlapping calls
      syncNow(user.uid, user.email).catch(console.error);
    });

    return unsubscribeNetInfo;
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppNavigator colorScheme={colorScheme} />
      </PersistGate>
    </Provider>
  );
}
