import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useGetMe, useSyncUser, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User as DbUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: DbUser | null | undefined;
  isLoading: boolean;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  syncCurrentUser: (role: "teacher" | "student") => Promise<DbUser>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  dbUser: null,
  isLoading: true,
  logout: async () => {},
  resetPassword: async () => {},
  syncCurrentUser: async () => { throw new Error("Not ready"); },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const queryClient = useQueryClient();
  const syncMutation = useSyncUser();

  useEffect(() => {
    // Explicitly set persistence to ensure users stay logged in
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (!user) {
        queryClient.clear();
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const { data: dbUser, isLoading: dbLoading } = useGetMe(
    { firebaseUid: firebaseUser?.uid ?? "" },
    {
      query: {
        queryKey: getGetMeQueryKey({ firebaseUid: firebaseUser?.uid ?? "" }),
        enabled: !!firebaseUser?.uid,
        retry: 2,
        retryDelay: 800,
        staleTime: 5 * 60 * 1000,
      },
    }
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    queryClient.clear();
  }, [queryClient]);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const syncCurrentUser = useCallback(
    async (role: "teacher" | "student"): Promise<DbUser> => {
      if (!firebaseUser) throw new Error("No authenticated user");
      const user = await syncMutation.mutateAsync({
        data: {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          displayName: firebaseUser.displayName,
          role,
        },
      });
      return user;
    },
    [firebaseUser, syncMutation]
  );

  const isLoading = authLoading || (!!firebaseUser && dbLoading);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, dbUser, isLoading, logout, resetPassword, syncCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
