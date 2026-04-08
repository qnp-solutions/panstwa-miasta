import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SCORING, normalizeAnswer } from '../shared/constants';
import type { RoomDocument, RoundDocument, VoteDocument, VoteValue } from '../shared/types';

const db = getFirestore();

interface CategoryBreakdown {
  answer: string;
  points: number;
  reason: 'unique' | 'shared' | 'bonus' | 'invalid' | 'empty' | 'vote_tie';
  validVotes: number;
  invalidVotes: number;
}

function getVoteCounts(
  targetUid: string,
  categoryKey: string,
  votes: Record<string, VoteDocument>,
  playerUids: string[],
): { validVotes: number; invalidVotes: number } {
  const otherUids = playerUids.filter((uid) => uid !== targetUid);
  let validVotes = 0;
  let invalidVotes = 0;

  for (const voterUid of otherUids) {
    const voterDoc = votes[voterUid];
    if (!voterDoc) continue;
    const vote: VoteValue | undefined = voterDoc.votes[`${targetUid}_${categoryKey}`];
    if (!vote || vote === 'abstain') continue;
    if (vote === 'valid') validVotes++;
    else invalidVotes++;
  }

  return { validVotes, invalidVotes };
}

function getAnswerValidity(
  validVotes: number,
  invalidVotes: number,
): 'valid' | 'tie' | 'invalid' {
  if (validVotes + invalidVotes === 0) return 'valid';
  if (validVotes > invalidVotes) return 'valid';
  if (validVotes === invalidVotes) return 'tie';
  return 'invalid';
}

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
    for (const voteDoc of votesSnap.docs) {
      votes[voteDoc.id] = voteDoc.data() as VoteDocument;
    }

    // In a solo-player game there are no other players to vote, so proceed immediately.
    // In multiplayer, wait until all players have submitted their vote documents.
    if (playerUids.length > 1 && votesSnap.size < playerUids.length) return;

    // Calculate scores with breakdown
    const roundScores: Record<string, number> = {};
    const breakdown: Record<string, CategoryBreakdown[]> = {};

    for (const uid of playerUids) {
      roundScores[uid] = 0;
      breakdown[uid] = [];
    }

    for (const categoryKey of room.categories) {
      // First pass: determine vote validity per player
      const playerVoteInfo: Record<string, {
        rawAnswer: string;
        validity: 'valid' | 'tie' | 'invalid';
        validVotes: number;
        invalidVotes: number;
      }> = {};

      const validAnswers: Record<string, string> = {};

      for (const uid of playerUids) {
        const rawAnswer = round.playerAnswers[uid]?.answers[categoryKey] ?? '';
        if (!rawAnswer.trim()) continue;

        const { validVotes, invalidVotes } = getVoteCounts(uid, categoryKey, votes, playerUids);
        const validity = getAnswerValidity(validVotes, invalidVotes);

        playerVoteInfo[uid] = { rawAnswer, validity, validVotes, invalidVotes };

        if (validity === 'valid') {
          validAnswers[uid] = normalizeAnswer(rawAnswer);
        }
      }

      // Group valid answers (case-insensitive via normalizeAnswer)
      const answerGroups: Record<string, string[]> = {};
      for (const [uid, normalized] of Object.entries(validAnswers)) {
        if (!answerGroups[normalized]) answerGroups[normalized] = [];
        answerGroups[normalized].push(uid);
      }

      const totalValidPlayers = Object.keys(validAnswers).length;

      // Assign scores per player
      for (const uid of playerUids) {
        const rawAnswer = round.playerAnswers[uid]?.answers[categoryKey] ?? '';
        const info = playerVoteInfo[uid];

        if (!rawAnswer.trim()) {
          breakdown[uid].push({
            answer: '', points: 0, reason: 'empty', validVotes: 0, invalidVotes: 0,
          });
          continue;
        }

        if (!info) {
          breakdown[uid].push({
            answer: rawAnswer, points: 0, reason: 'empty', validVotes: 0, invalidVotes: 0,
          });
          continue;
        }

        // Vote tie → fixed 5 points
        if (info.validity === 'tie') {
          roundScores[uid] += SCORING.SHARED;
          breakdown[uid].push({
            answer: rawAnswer,
            points: SCORING.SHARED,
            reason: 'vote_tie',
            validVotes: info.validVotes,
            invalidVotes: info.invalidVotes,
          });
          continue;
        }

        // Voted invalid → 0 points
        if (info.validity === 'invalid') {
          breakdown[uid].push({
            answer: rawAnswer,
            points: 0,
            reason: 'invalid',
            validVotes: info.validVotes,
            invalidVotes: info.invalidVotes,
          });
          continue;
        }

        // Valid answer — score based on uniqueness
        const normalized = validAnswers[uid];
        const shareGroup = answerGroups[normalized];
        let points: number;
        let reason: CategoryBreakdown['reason'];

        if (totalValidPlayers === 1) {
          points = SCORING.BONUS;
          reason = 'bonus';
        } else if (shareGroup.length > 1) {
          points = SCORING.SHARED;
          reason = 'shared';
        } else {
          points = SCORING.UNIQUE;
          reason = 'unique';
        }

        roundScores[uid] += points;
        breakdown[uid].push({
          answer: rawAnswer,
          points,
          reason,
          validVotes: info.validVotes,
          invalidVotes: info.invalidVotes,
        });
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
    batch.update(roundRef, {
      scores: roundScores,
      scoreBreakdown: breakdown,
      status: 'scored',
    });
    batch.update(roomRef, {
      status: nextRoomStatus,
      currentRound: isLastRound ? room.currentRound : room.currentRound + 1,
      ...playerScoreUpdates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
  },
);
