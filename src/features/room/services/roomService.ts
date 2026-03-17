import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { functions, db } from '../../../services/firebase/config';
import { roomConverter } from '../../../services/firebase/converters';
import type { RoomDocument } from '../../../types/firebase';

interface CreateRoomParams {
  nickname: string;
  language: 'pl' | 'en';
  categories: string[];
  totalRounds: number;
  countdownDuration: number;
}

interface JoinRoomParams {
  roomCode: string;
  nickname: string;
}

export async function createRoom(params: CreateRoomParams): Promise<string> {
  const fn = httpsCallable<CreateRoomParams, { roomCode: string }>(functions, 'createRoom');
  const result = await fn(params);
  return result.data.roomCode;
}

export async function joinRoom(params: JoinRoomParams): Promise<string> {
  const fn = httpsCallable<JoinRoomParams, { roomCode: string }>(functions, 'joinRoom');
  const result = await fn(params);
  return result.data.roomCode;
}

export async function leaveRoom(roomCode: string): Promise<void> {
  const fn = httpsCallable<{ roomCode: string }, { success: boolean }>(functions, 'leaveRoom');
  await fn({ roomCode });
}

export function subscribeToRoom(
  roomCode: string,
  onData: (room: RoomDocument) => void,
  onError: (error: Error) => void,
): () => void {
  const ref = doc(db, 'rooms', roomCode).withConverter(roomConverter);
  return onSnapshot(
    ref,
    (snapshot) => {
      const data = snapshot.data();
      if (data) onData(data);
    },
    onError,
  );
}
