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
import { useEffect } from "react";
import { initDatabase } from "@/services/Database";
import type { RootState } from "@/store/store";
import { auth } from "@/firebaseConfig";

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        store.dispatch(
          login({ email: user.email, isAuthenticated: user.emailVerified }),
        );
      } else {
        store.dispatch(logout());
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppNavigator colorScheme={colorScheme} />
      </PersistGate>
    </Provider>
  );
}
