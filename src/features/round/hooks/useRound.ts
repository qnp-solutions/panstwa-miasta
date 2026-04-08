import { useEffect, useRef } from 'react';
import { subscribeToRound } from '../../room/services/roomService';
import { useRoundStore } from '../store/roundStore';

/**
 * Subscribes to a Firestore round document.
 * Second listener — lives only during round_active / countdown.
 */
export function useRoundSubscription(roomCode: string | null, roundIndex: number | null) {
  const setRound = useRoundStore((s) => s.setRound);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!roomCode || roundIndex == null) {
      setRound(null);
      return;
    }

    unsubRef.current = subscribeToRound(
      roomCode,
      roundIndex,
      (round) => setRound(round),
      (err) => console.error('Round subscription error:', err.message),
    );

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [roomCode, roundIndex, setRound]);
}
