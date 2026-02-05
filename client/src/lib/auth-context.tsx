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
    return onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        const userDoc = doc(db, "users", fUser.uid);
        
        // Initial fetch/sync
        const snap = await getDoc(userDoc);
        if (!snap.exists()) {
          const newUser = {
            id: fUser.uid,
            email: fUser.email,
            displayName: fUser.displayName,
            score: 0,
            raffleTickets: 0,
          };
          await setDoc(userDoc, newUser);
          setUser(newUser);
        }

        // Real-time sync for scores/tickets
        return onSnapshot(userDoc, (doc) => {
          if (doc.exists()) {
            setUser(doc.data());
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, firebaseUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
