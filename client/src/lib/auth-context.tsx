import { useEffect, useState, createContext, useContext } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  firebaseUser: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Parent Hub Sync via postMessage
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'RIVALIS_HUB_SYNC' && event.data.user) {
        const hubUser = event.data.user;
        setUser({
          ...hubUser,
          displayName: hubUser.displayName || hubUser.firstName,
          score: hubUser.score || 0,
          raffleTickets: hubUser.raffleTickets || 0
        });
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // In a real hub environment, the hub will push the user state.
    // For local dev/testing where no hub is present, we'll set a default guest
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, [loading]);

  useEffect(() => {
    // Rid of Firebase onAuthStateChanged as we rely on Hub Sync
    setLoading(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, firebaseUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
