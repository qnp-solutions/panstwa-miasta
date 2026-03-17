import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  nickname: string;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setNickname: (nickname: string) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  nickname: '',
  isLoading: false,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setNickname: (nickname) => set({ nickname }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: () => set({ isInitialized: true }),
}));
