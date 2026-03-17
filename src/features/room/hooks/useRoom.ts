import { useEffect, useRef } from 'react';
import { subscribeToRoom } from '../services/roomService';
import { useRoomStore } from '../store/roomStore';

/**
 * Subscribes to a Firestore room document.
 * Single onSnapshot listener — lives in the (game)/_layout.tsx orchestrator.
 */
export function useRoom(roomCode: string | null) {
  const setRoom = useRoomStore((s) => s.setRoom);
  const setError = useRoomStore((s) => s.setError);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      return;
    }

    unsubRef.current = subscribeToRoom(
      roomCode,
      (room) => setRoom(room),
      (err) => setError(err.message),
    );

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [roomCode, setRoom, setError]);
}
