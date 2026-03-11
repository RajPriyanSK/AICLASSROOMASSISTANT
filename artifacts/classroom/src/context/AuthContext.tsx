import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useGetMe } from "@workspace/api-client-react";
import type { User as DbUser } from "@workspace/api-client-react";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: DbUser | null | undefined;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  dbUser: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch DB user profile to get role (Teacher/Student)
  const { data: dbUser, isLoading: dbLoading } = useGetMe(
    { firebaseUid: firebaseUser?.uid || "" },
    {
      query: {
        enabled: !!firebaseUser?.uid,
        retry: false, // If not synced yet, don't keep retrying
      },
    }
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        isLoading: authLoading || (!!firebaseUser && dbLoading),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
