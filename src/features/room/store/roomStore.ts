import { create } from 'zustand';
import type { RoomDocument } from '../../../types/firebase';

interface RoomState {
  room: RoomDocument | null;
  roomCode: string | null;
  isLoading: boolean;
  error: string | null;
  setRoom: (room: RoomDocument | null) => void;
  setRoomCode: (code: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  roomCode: null,
  isLoading: false,
  error: null,
  setRoom: (room) => set({ room }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ room: null, roomCode: null, isLoading: false, error: null }),
}));
