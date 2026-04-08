import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { RoomDocument, RoundDocument } from '../shared/types';

const db = getFirestore();

/**
 * Called when the countdown timer expires.
 * Transitions the round from 'countdown' to 'voting'.
 * Any player can call this — the function validates that countdownEndsAt has passed.
 */
export const endRound = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const { roomCode } = request.data as { roomCode: string };
  if (!roomCode) throw new HttpsError('invalid-argument', 'roomCode required');

  const roomRef = db.collection('rooms').doc(roomCode);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError('not-found', 'Room not found');

  const room = roomSnap.data() as RoomDocument;
  if (room.status !== 'countdown') {
    // Already transitioned — no-op
    return { success: true };
  }

  const roundRef = roomRef.collection('rounds').doc(String(room.currentRound));
  const roundSnap = await roundRef.get();
  if (!roundSnap.exists) throw new HttpsError('not-found', 'Round not found');

  const round = roundSnap.data() as RoundDocument;
  if (round.status !== 'countdown') {
    return { success: true };
  }

  // Verify countdown has actually expired (allow 2s grace for clock skew)
  if (round.countdownEndsAt) {
    const endsAt = (round.countdownEndsAt as Timestamp).toMillis();
    if (Date.now() < endsAt - 2000) {
      throw new HttpsError('failed-precondition', 'Countdown has not expired yet');
    }
  }

  const batch = db.batch();
  batch.update(roundRef, {
    status: 'voting',
    endedAt: FieldValue.serverTimestamp(),
  });
  batch.update(roomRef, {
    status: 'voting',
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { success: true };
});
