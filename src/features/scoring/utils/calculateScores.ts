import { SCORING } from '../../../constants/scoring';
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
 * Returns vote counts for a specific answer.
 * Only counts votes from other players (a player can't vote on their own answer).
 */
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
    const voteKey = `${targetUid}_${categoryKey}`;
    const vote: VoteValue | undefined = voterDoc.votes[voteKey];
    if (!vote || vote === 'abstain') continue;
    if (vote === 'valid') validVotes++;
    else invalidVotes++;
  }

  return { validVotes, invalidVotes };
}

/**
 * Determines answer validity from votes:
 * - 'valid': more valid votes than invalid → normal scoring
 * - 'tie': equal valid and invalid votes → 5 points
 * - 'invalid': more invalid votes than valid → 0 points
 * - No votes cast → treated as valid
 */
function getAnswerValidity(
  validVotes: number,
  invalidVotes: number,
): 'valid' | 'tie' | 'invalid' {
  if (validVotes + invalidVotes === 0) return 'valid'; // no votes → assume valid
  if (validVotes > invalidVotes) return 'valid';
  if (validVotes === invalidVotes) return 'tie';
  return 'invalid';
}

/**
 * Pure function — calculates per-round scores for all players.
 * Used by both the Cloud Function (server) and tests.
 *
 * Scoring rules:
 * - Voted invalid (majority): 0 points
 * - Vote tie (equal valid/invalid): 5 points
 * - Only valid answer in category: 15 points (bonus)
 * - Unique valid answer (others have different valid answers): 10 points
 * - Shared valid answer (same as another player, case-insensitive): 5 points
 */
export function calculateScores(input: CalculateScoresInput): ScoreResult {
  const { round, votes, categories, playerUids } = input;
  const roundScores: Record<string, number> = {};
  const breakdown: Record<string, CategoryScore[]> = {};

  for (const uid of playerUids) {
    roundScores[uid] = 0;
    breakdown[uid] = [];
  }

  for (const categoryKey of categories) {
    // First pass: determine vote validity and collect vote counts per player
    const playerVoteInfo: Record<string, {
      rawAnswer: string;
      validity: 'valid' | 'tie' | 'invalid';
      validVotes: number;
      invalidVotes: number;
    }> = {};

    const validAnswers: Record<string, string> = {}; // uid → normalized answer (only for 'valid' answers)

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

    // Group valid answers by normalized form (case-insensitive comparison)
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
        breakdown[uid].push({ categoryKey, answer: '', points: 0, reason: 'empty' });
        continue;
      }

      if (!info) {
        breakdown[uid].push({ categoryKey, answer: rawAnswer, points: 0, reason: 'empty' });
        continue;
      }

      // Vote tie → fixed 5 points
      if (info.validity === 'tie') {
        roundScores[uid] += SCORING.SHARED;
        breakdown[uid].push({
          categoryKey,
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
          categoryKey,
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
      let reason: CategoryScore['reason'];

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
        categoryKey,
        answer: rawAnswer,
        points,
        reason,
        validVotes: info.validVotes,
        invalidVotes: info.invalidVotes,
      });
    }
  }

  return { roundScores, breakdown };
}
