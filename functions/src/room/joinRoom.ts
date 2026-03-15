import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { MAX_PLAYERS } from '../shared/constants';
import type { RoomDocument } from '../shared/types';

const db = getFirestore();

const JoinRoomSchema = z.object({
  roomCode: z.string().length(6),
  nickname: z.string().min(1).max(20),
});

export const joinRoom = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const parsed = JoinRoomSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

  const { roomCode, nickname } = parsed.data;
  const { uid } = request.auth;

  const roomRef = db.collection('rooms').doc(roomCode);
  const roomSnap = await roomRef.get();

  if (!roomSnap.exists) throw new HttpsError('not-found', 'Room not found');

  const room = roomSnap.data() as RoomDocument;

  if (room.status !== 'lobby') throw new HttpsError('failed-precondition', 'Game already started');

  if (uid in room.players) {
    // Already in room — just return
    return { roomCode };
  }

  const playerCount = Object.keys(room.players).length;
  if (playerCount >= MAX_PLAYERS) throw new HttpsError('resource-exhausted', 'Room is full');

  const now = FieldValue.serverTimestamp();
  const color = pickColor(uid);

  await roomRef.update({
    [`players.${uid}`]: {
      uid,
      nickname,
      avatarColor: color,
      totalScore: 0,
      isOnline: true,
      isHost: false,
      joinedAt: now,
    },
    updatedAt: now,
  });

  return { roomCode };
});

function pickColor(uid: string): string {
  const colors = ['#E63946','#457B9D','#2A9D8F','#E9C46A','#F4A261','#A8DADC','#6A4C93','#52B788'];
  const idx = uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[idx % colors.length];
}
