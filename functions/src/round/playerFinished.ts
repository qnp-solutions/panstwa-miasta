import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { RoomDocument, RoundDocument } from '../shared/types';

const db = getFirestore();

/**
 * Triggered when a round document is updated.
 * Detects when the first player submits their answers and starts the countdown.
 * Also handles the case where ALL players have submitted early (skips countdown).
 */
export const onPlayerFinished = onDocumentUpdated(
  { document: 'rooms/{roomCode}/rounds/{roundIndex}', region: 'europe-west1' },
  async (event) => {
    const before = event.data?.before.data() as RoundDocument | undefined;
    const after = event.data?.after.data() as RoundDocument | undefined;

    if (!before || !after) return;
    // Act during active (first submission) or countdown (remaining players submitting)
    if (after.status !== 'active' && after.status !== 'countdown') return;

    const { roomCode } = event.params;
    const roomRef = db.collection('rooms').doc(roomCode);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) return;

    const room = roomSnap.data() as RoomDocument;
    const playerUids = Object.keys(room.players);
    const roundRef = event.data!.after.ref;

    // Count submitted players after this update
    const submittedUids = playerUids.filter(
      (uid) => after.playerAnswers[uid]?.submittedAt != null,
    );
    const allSubmitted = submittedUids.length === playerUids.length;

    if (allSubmitted) {
      // Everyone done — skip/end countdown, go straight to voting
      const batch = db.batch();
      batch.update(roundRef, { status: 'voting', endedAt: FieldValue.serverTimestamp() });
      batch.update(roomRef, { status: 'voting', updatedAt: FieldValue.serverTimestamp() });
      await batch.commit();
      return;
    }

    // First submission detection only applies during active status
    if (after.status !== 'active') return;

    const wasAnySubmittedBefore = playerUids.some(
      (uid) => before.playerAnswers[uid]?.submittedAt != null,
    );
    const isFirstSubmission = !wasAnySubmittedBefore && submittedUids.length > 0;

    if (isFirstSubmission) {
      const firstFinisherUid = submittedUids[0];
      const countdownMs = room.countdownDuration * 1000;
      const countdownEndsAt = Timestamp.fromMillis(Date.now() + countdownMs);

      const batch = db.batch();
      batch.update(roundRef, {
        status: 'countdown',
        firstFinishedAt: FieldValue.serverTimestamp(),
        [`playerAnswers.${firstFinisherUid}.finishedFirst`]: true,
        countdownEndsAt,
      });
      batch.update(roomRef, { status: 'countdown', updatedAt: FieldValue.serverTimestamp() });
      await batch.commit();
    }
  },
);
