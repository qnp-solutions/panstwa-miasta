import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../services/firebase/config';
import { useAuthStore } from '../store/authStore';

/**
 * Subscribes to Firebase auth state and syncs it into the Zustand store.
 * Call once in the root layout.
 */
export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setNickname = useAuthStore((s) => s.setNickname);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user?.displayName) {
        setNickname(user.displayName);
      }
      setInitialized();
    });
    return unsubscribe;
  }, [setUser, setNickname, setInitialized]);
}
