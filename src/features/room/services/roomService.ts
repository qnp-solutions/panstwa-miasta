import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { functions, db } from '../../../services/firebase/config';
import { roomConverter, roundConverter } from '../../../services/firebase/converters';
import type { RoomDocument, RoundDocument, VoteValue } from '../../../types/firebase';

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

export function subscribeToRound(
  roomCode: string,
  roundIndex: number,
  onData: (round: RoundDocument) => void,
  onError: (error: Error) => void,
): () => void {
  const ref = doc(db, 'rooms', roomCode, 'rounds', String(roundIndex)).withConverter(roundConverter);
  return onSnapshot(
    ref,
    (snapshot) => {
      const data = snapshot.data();
      if (data) onData(data);
    },
    onError,
  );
}

/**
 * Submits answers for the current round by writing directly to Firestore.
 * The `onPlayerFinished` trigger detects the submittedAt field change and
 * handles countdown/voting transitions server-side.
 */
export async function submitAnswers(
  roomCode: string,
  roundIndex: number,
  uid: string,
  answers: Record<string, string>,
): Promise<void> {
  const roundRef = doc(db, 'rooms', roomCode, 'rounds', String(roundIndex));
  await updateDoc(roundRef, {
    [`playerAnswers.${uid}.answers`]: answers,
    [`playerAnswers.${uid}.submittedAt`]: serverTimestamp(),
  });
}

export async function submitVotes(
  roomCode: string,
  roundIndex: number,
  voterUid: string,
  votes: Record<string, VoteValue>,
): Promise<void> {
  const voteRef = doc(db, 'rooms', roomCode, 'rounds', String(roundIndex), 'votes', voterUid);
  await setDoc(voteRef, {
    voterUid,
    votes,
    submittedAt: serverTimestamp(),
  });
}

export async function fetchAllRounds(roomCode: string): Promise<RoundDocument[]> {
  const roundsRef = collection(db, 'rooms', roomCode, 'rounds').withConverter(roundConverter);
  const q = query(roundsRef, orderBy('roundIndex', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function callEndRound(roomCode: string): Promise<void> {
  const fn = httpsCallable<{ roomCode: string }, { success: boolean }>(functions, 'endRound');
  await fn({ roomCode });
}
