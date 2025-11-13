import { RootState } from "../store/store";
import { useSelector } from "react-redux";
import { Redirect } from "expo-router";

export default function Index() {
  const user = useSelector((state: RootState) => state.user);

  // If no user, redirect to auth
  if (!user.isLoggedIn) {
    return <Redirect href="/auth" />;
  }

  // If user exists but email is not verified, redirect to verification
  if (user && !user.isAuthenticated) {
    return <Redirect href="/email-verification" />;
  }

  // If user is verified, redirect to tabs (home)
  return <Redirect href="/(tabs)" />;
}
