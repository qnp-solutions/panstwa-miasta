import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SCORING, VOTE_VALIDITY_THRESHOLD, normalizeAnswer } from '../shared/constants';
import type { RoomDocument, RoundDocument, VoteDocument, VoteValue } from '../shared/types';

const db = getFirestore();

/**
 * Triggered when any vote document is written.
 * When all players have submitted votes, calculates scores and advances game state.
 */
export const processVotes = onDocumentWritten(
  { document: 'rooms/{roomCode}/rounds/{roundIndex}/votes/{voterUid}', region: 'europe-west1' },
  async (event) => {
    const { roomCode, roundIndex } = event.params;

    const roomRef = db.collection('rooms').doc(roomCode);
    const roundRef = roomRef.collection('rounds').doc(roundIndex);

    const [roomSnap, roundSnap] = await Promise.all([roomRef.get(), roundRef.get()]);
    if (!roomSnap.exists || !roundSnap.exists) return;

    const room = roomSnap.data() as RoomDocument;
    const round = roundSnap.data() as RoundDocument;

    if (round.status !== 'voting') return;

    const playerUids = Object.keys(room.players);

    // Fetch all vote documents for this round
    const votesSnap = await roundRef.collection('votes').get();
    const votes: Record<string, VoteDocument> = {};
    for (const doc of votesSnap.docs) {
      votes[doc.id] = doc.data() as VoteDocument;
    }

    // Not all players have voted yet
    if (votesSnap.size < playerUids.length) return;

    // Calculate scores
    const roundScores: Record<string, number> = {};
    for (const uid of playerUids) roundScores[uid] = 0;

    for (const categoryKey of room.categories) {
      const validAnswers: Record<string, string> = {};

      for (const uid of playerUids) {
        const rawAnswer = round.playerAnswers[uid]?.answers[categoryKey] ?? '';
        if (!rawAnswer.trim()) continue;
        if (isAnswerValid(uid, categoryKey, votes, playerUids)) {
          validAnswers[uid] = normalizeAnswer(rawAnswer);
        }
      }

      const answerGroups: Record<string, string[]> = {};
      for (const [uid, normalized] of Object.entries(validAnswers)) {
        if (!answerGroups[normalized]) answerGroups[normalized] = [];
        answerGroups[normalized].push(uid);
      }

      const totalValid = Object.keys(validAnswers).length;

      for (const uid of playerUids) {
        const normalized = validAnswers[uid];
        if (!normalized) continue;

        const shareGroup = answerGroups[normalized];
        let points: number;

        if (totalValid === 1) {
          points = SCORING.BONUS;
        } else if (shareGroup.length > 1) {
          points = SCORING.SHARED;
        } else {
          points = SCORING.UNIQUE;
        }

        roundScores[uid] += points;
      }
    }

    // Determine next state
    const isLastRound = room.currentRound + 1 >= room.totalRounds;
    const nextRoomStatus = isLastRound ? 'game_over' : 'results';

    // Build cumulative score updates
    const playerScoreUpdates: Record<string, unknown> = {};
    for (const uid of playerUids) {
      playerScoreUpdates[`players.${uid}.totalScore`] =
        FieldValue.increment(roundScores[uid]);
    }

    const batch = db.batch();
    batch.update(roundRef, { scores: roundScores, status: 'scored' });
    batch.update(roomRef, {
      status: nextRoomStatus,
      currentRound: isLastRound ? room.currentRound : room.currentRound + 1,
      ...playerScoreUpdates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
  },
);

function isAnswerValid(
  targetUid: string,
  categoryKey: string,
  votes: Record<string, VoteDocument>,
  playerUids: string[],
): boolean {
  const otherUids = playerUids.filter((uid) => uid !== targetUid);
  if (otherUids.length === 0) return true;

  let validVotes = 0;
  let totalVotes = 0;

  for (const voterUid of otherUids) {
    const voterDoc = votes[voterUid];
    if (!voterDoc) continue;
    const vote: VoteValue | undefined = voterDoc.votes[`${targetUid}_${categoryKey}`];
    if (!vote || vote === 'abstain') continue;
    totalVotes++;
    if (vote === 'valid') validVotes++;
  }

  if (totalVotes === 0) return true;
  return validVotes / totalVotes >= VOTE_VALIDITY_THRESHOLD;
}
