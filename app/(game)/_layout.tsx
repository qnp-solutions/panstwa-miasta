import { useEffect, useRef } from 'react';
import { Stack, useRouter, type Href } from 'expo-router';
import { useRoom } from '../../src/features/room/hooks/useRoom';
import { useRoomStore } from '../../src/features/room/store/roomStore';
import { useRoundStore } from '../../src/features/round/store/roundStore';
import type { RoomStatus } from '../../src/types/firebase';

const STATUS_TO_SEGMENT: Record<RoomStatus, string> = {
  lobby: 'lobby',
  round_active: 'round',
  countdown: 'countdown',
  voting: 'voting',
  scoring: 'voting',
  results: 'results',
  game_over: 'results',
};

/**
 * Central game orchestrator.
 * Single Firestore onSnapshot listener for the room document.
 * Watches room.status → router.replace() to the correct screen.
 */
export default function GameLayout() {
  const roomCode = useRoomStore((s) => s.roomCode);
  const room = useRoomStore((s) => s.room);
  const router = useRouter();
  const prevStatus = useRef<RoomStatus | null>(null);

  useRoom(roomCode);

  useEffect(() => {
    if (!room || !roomCode) return;

    // Reset round store when entering a new round
    if (room.status === 'round_active' && prevStatus.current !== 'round_active') {
      useRoundStore.getState().reset();
    }

    prevStatus.current = room.status;

    const segment = STATUS_TO_SEGMENT[room.status];
    if (segment) {
      router.replace(`/(game)/${segment}/${roomCode}` as Href);
    }
  }, [room?.status, roomCode, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
