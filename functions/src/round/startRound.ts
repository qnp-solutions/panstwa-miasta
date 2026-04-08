import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { pickRandomLetter, MIN_PLAYERS } from '../shared/constants';
import type { RoomDocument, RoundDocument, Language } from '../shared/types';

const db = getFirestore();

const StartRoundSchema = z.object({ roomCode: z.string().length(6) });

export const startRound = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const parsed = StartRoundSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

  const { roomCode } = parsed.data;
  const { uid } = request.auth;

  const roomRef = db.collection('rooms').doc(roomCode);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError('not-found', 'Room not found');

  const room = roomSnap.data() as RoomDocument;
  if (room.hostUid !== uid) throw new HttpsError('permission-denied', 'Only the host can start a round');

  const allowedStatuses = ['lobby', 'results'];
  if (!allowedStatuses.includes(room.status)) {
    throw new HttpsError('failed-precondition', `Cannot start round from status: ${room.status}`);
  }

  const playerCount = Object.keys(room.players).length;
  if (playerCount < MIN_PLAYERS) {
    throw new HttpsError('failed-precondition', `Need at least ${MIN_PLAYERS} players`);
  }

  const letter = pickRandomLetter(room.language as Language, room.usedLetters);
  if (!letter) throw new HttpsError('resource-exhausted', 'No more letters available');

  const roundIndex = room.currentRound;
  const now = FieldValue.serverTimestamp();

  // Initialize empty answers for each player
  const playerAnswers: RoundDocument['playerAnswers'] = {};
  for (const playerUid of Object.keys(room.players)) {
    const emptyAnswers: Record<string, string> = {};
    for (const cat of room.categories) emptyAnswers[cat] = '';
    playerAnswers[playerUid] = {
      uid: playerUid,
      answers: emptyAnswers,
      submittedAt: null,
      finishedFirst: false,
    };
  }

  const round: Omit<RoundDocument, 'startedAt'> & { startedAt: unknown } = {
    roundIndex,
    letter,
    status: 'active',
    startedAt: now,
    firstFinishedAt: null,
    countdownEndsAt: null,
    endedAt: null,
    playerAnswers,
    scores: null,
    scoreBreakdown: null,
  };

  const batch = db.batch();
  batch.set(
    db.collection('rooms').doc(roomCode).collection('rounds').doc(String(roundIndex)),
    round,
  );
  batch.update(roomRef, {
    status: 'round_active',
    usedLetters: [...room.usedLetters, letter],
    updatedAt: now,
  });

  await batch.commit();
  return { letter, roundIndex };
});
