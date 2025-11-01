import { useAuth } from "../context/authContext";
import { Redirect } from "expo-router";

export default function Index() {
  const { user, loading, isEmailVerified } = useAuth();

  if (loading) {
    return null; // or a loading screen
  }

  // If no user, redirect to auth
  if (!user) {
    return <Redirect href="/auth" />;
  }

  // If user exists but email is not verified, redirect to verification
  if (user && !isEmailVerified) {
    return <Redirect href="/email-verification" />;
  }

  // If user is verified, redirect to tabs (home)
  return <Redirect href="/(tabs)" />;
}
