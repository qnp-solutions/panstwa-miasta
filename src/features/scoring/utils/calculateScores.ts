import { SCORING } from '../../../constants/scoring';
import { VOTE_VALIDITY_THRESHOLD } from '../../../constants/game';
import { normalizeAnswer } from '../../../utils/normalizeAnswer';
import type { VoteValue, RoundDocument, VoteDocument } from '../../../types/firebase';
import type { CategoryScore } from '../../../types/game';

interface CalculateScoresInput {
  round: RoundDocument;
  votes: Record<string, VoteDocument>; // keyed by voterUid
  categories: string[];
  playerUids: string[];
}

export interface ScoreResult {
  /** Points earned this round per player uid */
  roundScores: Record<string, number>;
  /** Detailed breakdown per player uid → category → result */
  breakdown: Record<string, CategoryScore[]>;
}

/**
 * Determines whether an answer is valid based on votes from other players.
 * A player cannot vote on their own answer (those votes are ignored).
 */
function isAnswerValid(
  targetUid: string,
  categoryKey: string,
  votes: Record<string, VoteDocument>,
  playerUids: string[],
): boolean {
  const otherUids = playerUids.filter((uid) => uid !== targetUid);
  if (otherUids.length === 0) return true; // single player edge case

  let validVotes = 0;
  let totalVotes = 0;

  for (const voterUid of otherUids) {
    const voterDoc = votes[voterUid];
    if (!voterDoc) continue;
    const voteKey = `${targetUid}_${categoryKey}`;
    const vote: VoteValue | undefined = voterDoc.votes[voteKey];
    if (!vote || vote === 'abstain') continue;
    totalVotes++;
    if (vote === 'valid') validVotes++;
  }

  if (totalVotes === 0) return true; // no one voted → assume valid
  return validVotes / totalVotes >= VOTE_VALIDITY_THRESHOLD;
}

/**
 * Pure function — calculates per-round scores for all players.
 * Used by both the Cloud Function (server) and tests.
 */
export function calculateScores(input: CalculateScoresInput): ScoreResult {
  const { round, votes, categories, playerUids } = input;
  const roundScores: Record<string, number> = {};
  const breakdown: Record<string, CategoryScore[]> = {};

  // Initialize
  for (const uid of playerUids) {
    roundScores[uid] = 0;
    breakdown[uid] = [];
  }

  for (const categoryKey of categories) {
    // Collect valid answers for this category
    const validAnswers: Record<string, string> = {}; // uid → normalized answer

    for (const uid of playerUids) {
      const playerAnswers = round.playerAnswers[uid];
      const rawAnswer = playerAnswers?.answers[categoryKey] ?? '';
      if (!rawAnswer.trim()) continue; // empty answer

      const valid = isAnswerValid(uid, categoryKey, votes, playerUids);
      if (valid) {
        validAnswers[uid] = normalizeAnswer(rawAnswer);
      }
    }

    // Count occurrences of each normalized answer among valid answers
    const answerCounts: Record<string, string[]> = {}; // normalizedAnswer → [uid]
    for (const [uid, normalized] of Object.entries(validAnswers)) {
      if (!answerCounts[normalized]) answerCounts[normalized] = [];
      answerCounts[normalized].push(uid);
    }

    const totalValidPlayers = Object.keys(validAnswers).length;

    // Assign scores per player
    for (const uid of playerUids) {
      const rawAnswer = round.playerAnswers[uid]?.answers[categoryKey] ?? '';
      const normalized = validAnswers[uid]; // undefined if invalid/empty

      if (!normalized) {
        // Invalid or empty
        breakdown[uid].push({
          categoryKey,
          answer: rawAnswer,
          points: 0,
          reason: rawAnswer.trim() ? 'invalid' : 'empty',
        });
        continue;
      }

      const shareGroup = answerCounts[normalized];
      let points: number;
      let reason: CategoryScore['reason'];

      if (totalValidPlayers === 1) {
        // Only one player has ANY valid answer in this category
        points = SCORING.BONUS;
        reason = 'bonus';
      } else if (shareGroup.length > 1) {
        // Multiple players share this exact answer
        points = SCORING.SHARED;
        reason = 'shared';
      } else {
        // Unique valid answer among multiple valid answers
        points = SCORING.UNIQUE;
        reason = 'unique';
      }

      roundScores[uid] += points;
      breakdown[uid].push({ categoryKey, answer: rawAnswer, points, reason });
    }
  }

  return { roundScores, breakdown };
}
