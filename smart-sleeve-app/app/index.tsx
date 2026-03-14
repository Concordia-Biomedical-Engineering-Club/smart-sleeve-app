import { RootState } from "../store/store";
import { useSelector } from "react-redux";
import { Redirect } from "expo-router";

export default function Index() {
  const user = useSelector((state: RootState) => state.user);

  // If no user, redirect to auth
  if (!user.isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // If user exists but email is not verified, redirect to verification
  if (user && !user.isAuthenticated) {
    return <Redirect href="/email-verification" />;
  }

  // If user is verified, redirect to tabs (home) or onboarding
  if (!user.hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/dashboard" />;
}
