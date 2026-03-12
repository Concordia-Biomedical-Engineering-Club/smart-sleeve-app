import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Provider, useSelector } from "react-redux";
import { store, persistor } from "../store/store";
import { PersistGate } from "redux-persist/integration/react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { login, logout } from "../store/userSlice";
import { useEffect } from "react";
import { initDatabase } from "@/services/Database";
import type { RootState } from "@/store/store";

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

  useEffect(() => {
    if (isLoggedIn && (!hasCompletedOnboarding || !injuredSide)) {
      router.replace("/onboarding" as any);
    }
  }, [isLoggedIn, hasCompletedOnboarding, injuredSide]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
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
    const auth = getAuth();
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
