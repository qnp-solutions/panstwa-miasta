import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import { z } from 'zod';
import {
  generateRoomCode,
  DEFAULT_COUNTDOWN_SECONDS,
  MAX_PLAYERS,
} from '../shared/constants';
import type { RoomDocument, Language } from '../shared/types';

// Initialize Admin SDK once (idempotent)
try { initializeApp(); } catch {}

const db = getFirestore();

const CreateRoomSchema = z.object({
  nickname: z.string().min(1).max(20),
  language: z.enum(['pl', 'en']),
  categories: z.array(z.string().min(1).max(40)).min(1).max(12),
  totalRounds: z.number().int().min(1).max(10),
  countdownDuration: z.number().int().min(5).max(60),
});

export const createRoom = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const parsed = CreateRoomSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

  const { nickname, language, categories, totalRounds, countdownDuration } = parsed.data;
  const { uid } = request.auth;

  // Generate a unique room code (retry up to 5 times on collision)
  let roomCode = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRoomCode();
    const existing = await db.collection('rooms').doc(candidate).get();
    if (!existing.exists) { roomCode = candidate; break; }
  }
  if (!roomCode) throw new HttpsError('internal', 'Could not generate room code');

  const now = FieldValue.serverTimestamp();
  const room: Omit<RoomDocument, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } = {
    roomCode,
    hostUid: uid,
    status: 'lobby',
    currentRound: 0,
    totalRounds,
    countdownDuration,
    categories,
    language: language as Language,
    usedLetters: [],
    players: {
      [uid]: {
        uid,
        nickname,
        avatarColor: pickColor(uid),
        totalScore: 0,
        isOnline: true,
        isHost: true,
        joinedAt: now as never,
      },
    },
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('rooms').doc(roomCode).set(room);
  return { roomCode };
});

function pickColor(uid: string): string {
  const colors = ['#E63946','#457B9D','#2A9D8F','#E9C46A','#F4A261','#A8DADC','#6A4C93','#52B788'];
  const idx = uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[idx % colors.length];
}
