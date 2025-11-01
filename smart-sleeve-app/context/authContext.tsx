import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, User, reload } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isEmailVerified: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    let interval: ReturnType<typeof setInterval> | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Start checking for email verification
        setIsEmailVerified(currentUser.emailVerified);

        // Set up an interval to periodically reload the user's state
        interval = setInterval(async () => {
          await reload(currentUser);
          const freshUser = auth.currentUser;
          if (freshUser && freshUser.emailVerified !== isEmailVerified) {
            setIsEmailVerified(freshUser.emailVerified);
            if (freshUser.emailVerified) {
              // Clear interval once verified
              if (interval) {
                clearInterval(interval);
                interval = null;
              }
            }
          }
        }, 3000); // Check every 3 seconds
      } else {
        setIsEmailVerified(false);
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
      setLoading(false);
    });

    // Cleanup subscription and interval on unmount
    return () => {
      unsubscribe();
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isEmailVerified]);

  return (
    <AuthContext.Provider value={{ user, loading, isEmailVerified }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
