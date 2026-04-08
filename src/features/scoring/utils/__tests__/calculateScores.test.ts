import { calculateScores } from '../calculateScores';
import type { RoundDocument, VoteDocument } from '../../../../types/firebase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NULL_TIMESTAMP = null as unknown as import('firebase/firestore').Timestamp;

function makeRound(
  playerAnswers: Record<string, Record<string, string>>,
): RoundDocument {
  return {
    roundIndex: 0,
    letter: 'K',
    status: 'voting',
    startedAt: NULL_TIMESTAMP,
    firstFinishedAt: NULL_TIMESTAMP,
    countdownEndsAt: NULL_TIMESTAMP,
    endedAt: NULL_TIMESTAMP,
    scores: null,
    scoreBreakdown: null,
    playerAnswers: Object.fromEntries(
      Object.entries(playerAnswers).map(([uid, answers]) => [
        uid,
        {
          uid,
          answers,
          submittedAt: NULL_TIMESTAMP,
          finishedFirst: false,
        },
      ]),
    ),
  };
}

function makeVotes(
  voteMap: Record<string, Record<string, 'valid' | 'invalid' | 'abstain'>>,
): Record<string, VoteDocument> {
  return Object.fromEntries(
    Object.entries(voteMap).map(([voterUid, votes]) => [
      voterUid,
      {
        voterUid,
        votes,
        submittedAt: NULL_TIMESTAMP,
      },
    ]),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('calculateScores', () => {
  const CATEGORIES = ['country'];
  const BONUS = 15;
  const UNIQUE = 10;
  const SHARED = 5;

  // ── Scenario 1: All players empty for a category ───────────────────────────
  it('scenario 1 — all players empty: everyone gets 0 with reason "empty"', () => {
    const round = makeRound({ p1: { country: '' }, p2: { country: '' } });
    const votes = makeVotes({});
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });

    expect(roundScores.p1).toBe(0);
    expect(roundScores.p2).toBe(0);
    expect(breakdown.p1[0].reason).toBe('empty');
    expect(breakdown.p2[0].reason).toBe('empty');
  });

  // ── Scenario 2: Single player only valid answer (bonus 15) ─────────────────
  it('scenario 2 — single player only valid: earns bonus 15', () => {
    const round = makeRound({ p1: { country: 'Kenia' } });
    const votes = makeVotes({});
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1'],
    });

    expect(roundScores.p1).toBe(BONUS);
    expect(breakdown.p1[0].points).toBe(BONUS);
    expect(breakdown.p1[0].reason).toBe('bonus');
  });

  // ── Scenario 3: Two players same answer (shared 5 each) ────────────────────
  it('scenario 3 — two players same answer: each earns shared 5', () => {
    const round = makeRound({
      p1: { country: 'Kenia' },
      p2: { country: 'Kenia' },
    });
    // No votes → answers default to valid
    const votes = makeVotes({});
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });

    expect(roundScores.p1).toBe(SHARED);
    expect(roundScores.p2).toBe(SHARED);
    expect(breakdown.p1[0].reason).toBe('shared');
    expect(breakdown.p2[0].reason).toBe('shared');
  });

  // ── Scenario 4: Two players different answers (unique 10 each) ─────────────
  it('scenario 4 — two players different valid answers: each earns unique 10', () => {
    const round = makeRound({
      p1: { country: 'Kenia' },
      p2: { country: 'Kamerun' },
    });
    const votes = makeVotes({});
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });

    expect(roundScores.p1).toBe(UNIQUE);
    expect(roundScores.p2).toBe(UNIQUE);
    expect(breakdown.p1[0].reason).toBe('unique');
    expect(breakdown.p2[0].reason).toBe('unique');
  });

  // ── Scenario 5: Answer voted invalid gets 0 ────────────────────────────────
  it('scenario 5 — answer voted invalid by all others: gets 0 with reason "invalid"', () => {
    const round = makeRound({
      p1: { country: 'Xyzland' },
      p2: { country: 'Kamerun' },
      p3: { country: 'Kenia' },
    });
    // p2 and p3 both vote p1's answer invalid
    const votes = makeVotes({
      p2: { 'p1_country': 'invalid' },
      p3: { 'p1_country': 'invalid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3'],
    });

    expect(roundScores.p1).toBe(0);
    expect(breakdown.p1[0].reason).toBe('invalid');
    // p2 and p3 have different valid answers → unique 10 each
    expect(roundScores.p2).toBe(UNIQUE);
    expect(roundScores.p3).toBe(UNIQUE);
  });

  // ── Scenario 6: Mix of valid/invalid/empty in one category ─────────────────
  it('scenario 6 — mix: valid unique, valid shared, invalid, empty', () => {
    const round = makeRound({
      p1: { country: 'Kenia' },     // unique valid
      p2: { country: 'Kamerun' },   // shared valid
      p3: { country: 'Kamerun' },   // shared valid
      p4: { country: 'Xyzland' },   // voted invalid
      p5: { country: '' },           // empty
    });
    const votes = makeVotes({
      p1: { 'p4_country': 'invalid' },
      p2: { 'p4_country': 'invalid' },
      p3: { 'p4_country': 'invalid' },
      p5: { 'p4_country': 'invalid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3', 'p4', 'p5'],
    });

    expect(roundScores.p1).toBe(UNIQUE);
    expect(breakdown.p1[0].reason).toBe('unique');

    expect(roundScores.p2).toBe(SHARED);
    expect(breakdown.p2[0].reason).toBe('shared');

    expect(roundScores.p3).toBe(SHARED);
    expect(breakdown.p3[0].reason).toBe('shared');

    expect(roundScores.p4).toBe(0);
    expect(breakdown.p4[0].reason).toBe('invalid');

    expect(roundScores.p5).toBe(0);
    expect(breakdown.p5[0].reason).toBe('empty');
  });

  // ── Scenario 7: Vote tie (equal valid/invalid) → 5 points ─────────────────
  it('scenario 7 — exactly 50% valid votes (tie): answer gets shared 5 with reason "vote_tie"', () => {
    // p1 is the target; p2 votes valid, p3 votes invalid → 1 valid, 1 invalid → tie
    const round = makeRound({
      p1: { country: 'Kenia' },
      p2: { country: 'Kamerun' },
      p3: { country: 'Kuwait' },
    });
    const votes = makeVotes({
      p2: { 'p1_country': 'valid' },
      p3: { 'p1_country': 'invalid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3'],
    });

    // p1 gets 5 points (vote tie) — not scored through uniqueness
    expect(roundScores.p1).toBe(SHARED);
    expect(breakdown.p1[0].reason).toBe('vote_tie');
    expect(breakdown.p1[0].validVotes).toBe(1);
    expect(breakdown.p1[0].invalidVotes).toBe(1);
  });

  // ── Scenario 8: Vote threshold edge — below 50% → invalid ──────────────────
  it('scenario 8 — below 50% valid votes (< threshold 0.5): answer is invalid', () => {
    // p1 is the target; p2 votes invalid, p3 votes invalid, p4 votes valid → 1/3 < 0.5 → invalid
    const round = makeRound({
      p1: { country: 'Xyzland' },
      p2: { country: 'Kamerun' },
      p3: { country: 'Kuwait' },
      p4: { country: 'Kolumbia' },
    });
    const votes = makeVotes({
      p2: { 'p1_country': 'invalid' },
      p3: { 'p1_country': 'invalid' },
      p4: { 'p1_country': 'valid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3', 'p4'],
    });

    expect(roundScores.p1).toBe(0);
    expect(breakdown.p1[0].reason).toBe('invalid');
  });

  // ── Scenario 9: Abstain votes don't count toward threshold ─────────────────
  it('scenario 9 — abstain votes are excluded from threshold calculation', () => {
    // p1 is target; p2 abstains, p3 votes valid → totalVotes = 1, validVotes = 1 → 1/1 = 1.0 ≥ 0.5 → valid
    const round = makeRound({
      p1: { country: 'Kenia' },
      p2: { country: 'Kamerun' },
      p3: { country: 'Kuwait' },
    });
    const votes = makeVotes({
      p2: { 'p1_country': 'abstain' },
      p3: { 'p1_country': 'valid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3'],
    });

    // p1 valid, p2 valid, p3 valid — all different answers → all unique
    expect(roundScores.p1).toBe(UNIQUE);
    expect(breakdown.p1[0].reason).toBe('unique');
  });

  it('scenario 9b — all voters abstain: answer defaults to valid (no real votes)', () => {
    // When totalVotes === 0 (all abstain), isAnswerValid returns true
    const round = makeRound({
      p1: { country: 'Kenia' },
      p2: { country: 'Kamerun' },
    });
    const votes = makeVotes({
      p2: { 'p1_country': 'abstain' },
      p1: { 'p2_country': 'abstain' },
    });
    const { roundScores } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });

    // Both have different valid answers → unique
    expect(roundScores.p1).toBe(UNIQUE);
    expect(roundScores.p2).toBe(UNIQUE);
  });

  // ── Scenario 10: Multi-category round scoring ───────────────────────────────
  it('scenario 10 — multi-category round: scores accumulate across categories', () => {
    const categories = ['country', 'city', 'animal'];
    const round = makeRound({
      p1: { country: 'Kenia', city: 'Kraków', animal: 'Krokodyl' },
      p2: { country: 'Kenia', city: 'Kalisz',  animal: 'Krokodyl' },
    });
    const votes = makeVotes({});
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories,
      playerUids: ['p1', 'p2'],
    });

    // country: both 'kenia' → shared (5 each)
    // city: different ('kraków' vs 'kalisz') → unique (10 each)
    // animal: both 'krokodyl' → shared (5 each)
    // total: 5 + 10 + 5 = 20 each
    expect(roundScores.p1).toBe(20);
    expect(roundScores.p2).toBe(20);
    expect(breakdown.p1).toHaveLength(3);
    expect(breakdown.p2).toHaveLength(3);
  });

  // ── Scenario 11: Polish diacritics preserved (Kraków ≠ Krakow) ─────────────
  it('scenario 11 — Polish diacritics preserved: Kraków ≠ Krakow → unique answers', () => {
    const categories = ['city'];
    const round = makeRound({
      p1: { city: 'Kraków' },
      p2: { city: 'Krakow' },
    });
    const votes = makeVotes({});
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories,
      playerUids: ['p1', 'p2'],
    });

    // Different normalized forms → unique (10 each)
    expect(roundScores.p1).toBe(UNIQUE);
    expect(roundScores.p2).toBe(UNIQUE);
    expect(breakdown.p1[0].reason).toBe('unique');
    expect(breakdown.p2[0].reason).toBe('unique');
  });

  // ── Additional edge cases ───────────────────────────────────────────────────

  it('case-insensitive deduplication: "Kenia" and "kenia" are the same answer', () => {
    const round = makeRound({
      p1: { country: 'Kenia' },
      p2: { country: 'kenia' },
    });
    const votes = makeVotes({});
    const { roundScores } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });

    // Same normalized answer → shared
    expect(roundScores.p1).toBe(SHARED);
    expect(roundScores.p2).toBe(SHARED);
  });

  it('player cannot vote on their own answer (self-votes ignored)', () => {
    // p1 votes their own answer valid, but p2 votes it invalid → 0/1 < 0.5 → invalid
    const round = makeRound({
      p1: { country: 'Xyzland' },
      p2: { country: 'Kamerun' },
    });
    const votes = makeVotes({
      p1: { 'p1_country': 'valid' }, // self-vote, should be ignored
      p2: { 'p1_country': 'invalid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });

    expect(roundScores.p1).toBe(0);
    expect(breakdown.p1[0].reason).toBe('invalid');
  });

  it('initializes roundScores to 0 for all players', () => {
    const round = makeRound({ p1: { country: '' }, p2: { country: '' } });
    const { roundScores } = calculateScores({
      round,
      votes: {},
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });
    expect(roundScores).toEqual({ p1: 0, p2: 0 });
  });

  it('single player with empty answer gets 0 with reason "empty"', () => {
    const round = makeRound({ p1: { country: '' } });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes: {},
      categories: CATEGORIES,
      playerUids: ['p1'],
    });
    expect(roundScores.p1).toBe(0);
    expect(breakdown.p1[0].reason).toBe('empty');
  });

  it('whitespace-only answer treated as empty', () => {
    const round = makeRound({ p1: { country: '   ' }, p2: { country: 'Kenia' } });
    const votes = makeVotes({});
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });
    expect(roundScores.p1).toBe(0);
    expect(breakdown.p1[0].reason).toBe('empty');
    // p2 is the only valid player → bonus
    expect(roundScores.p2).toBe(BONUS);
  });

  // ── Scenario 12: Vote tie with 2v2 voters → 5 points, reason: 'vote_tie' ────
  it('scenario 12 — vote tie with 2v2 voters: 5 points with reason "vote_tie"', () => {
    // p1 is the target; p2 and p3 vote valid, p4 and p5 vote invalid → 2v2 tie
    const round = makeRound({
      p1: { country: 'Polska' },
      p2: { country: 'Kenia' },
      p3: { country: 'Kamerun' },
      p4: { country: 'Kuwait' },
      p5: { country: 'Kolumbia' },
    });
    const votes = makeVotes({
      p2: { 'p1_country': 'valid' },
      p3: { 'p1_country': 'valid' },
      p4: { 'p1_country': 'invalid' },
      p5: { 'p1_country': 'invalid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3', 'p4', 'p5'],
    });

    expect(roundScores.p1).toBe(SHARED);
    expect(breakdown.p1[0].reason).toBe('vote_tie');
    expect(breakdown.p1[0].validVotes).toBe(2);
    expect(breakdown.p1[0].invalidVotes).toBe(2);
  });

  // ── Scenario 13: Majority valid (2 valid, 1 invalid) → normal scoring ────────
  it('scenario 13 — majority valid (2 valid, 1 invalid): normal scoring applies', () => {
    // p1 is the target; 2 voters say valid, 1 says invalid → majority valid → normal scoring
    const round = makeRound({
      p1: { country: 'Kenia' },
      p2: { country: 'Kamerun' },
      p3: { country: 'Kuwait' },
      p4: { country: 'Kolumbia' },
    });
    const votes = makeVotes({
      p2: { 'p1_country': 'valid' },
      p3: { 'p1_country': 'valid' },
      p4: { 'p1_country': 'invalid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3', 'p4'],
    });

    // p1 is valid and has a unique answer among the valid players → unique 10
    expect(roundScores.p1).toBe(UNIQUE);
    expect(breakdown.p1[0].reason).toBe('unique');
  });

  // ── Scenario 14: Majority invalid (1 valid, 2 invalid) → 0 points ────────────
  it('scenario 14 — majority invalid (1 valid, 2 invalid): 0 points with reason "invalid"', () => {
    // p1 is the target; 1 voter says valid, 2 say invalid → majority invalid → 0 points
    const round = makeRound({
      p1: { country: 'Xyzland' },
      p2: { country: 'Kamerun' },
      p3: { country: 'Kuwait' },
      p4: { country: 'Kolumbia' },
    });
    const votes = makeVotes({
      p2: { 'p1_country': 'valid' },
      p3: { 'p1_country': 'invalid' },
      p4: { 'p1_country': 'invalid' },
    });
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3', 'p4'],
    });

    expect(roundScores.p1).toBe(0);
    expect(breakdown.p1[0].reason).toBe('invalid');
  });

  // ── Scenario 15: Breakdown includes validVotes and invalidVotes counts ────────
  it('scenario 15 — breakdown includes validVotes and invalidVotes counts', () => {
    const round = makeRound({
      p1: { country: 'Kenia' },
      p2: { country: 'Kamerun' },
      p3: { country: 'Kuwait' },
    });
    const votes = makeVotes({
      p2: { 'p1_country': 'valid' },
      p3: { 'p1_country': 'invalid' },
    });
    const { breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2', 'p3'],
    });

    // p1 has a vote tie (1 valid, 1 invalid) — breakdown should contain vote counts
    expect(breakdown.p1[0].validVotes).toBe(1);
    expect(breakdown.p1[0].invalidVotes).toBe(1);
  });

  // ── Scenario 16: Case-insensitive: "POLSKA" and "polska" are shared ───────────
  it('scenario 16 — case-insensitive comparison: "POLSKA" and "polska" are the same answer (shared 5pts)', () => {
    const round = makeRound({
      p1: { country: 'POLSKA' },
      p2: { country: 'polska' },
    });
    const votes = makeVotes({});
    const { roundScores, breakdown } = calculateScores({
      round,
      votes,
      categories: CATEGORIES,
      playerUids: ['p1', 'p2'],
    });

    expect(roundScores.p1).toBe(SHARED);
    expect(roundScores.p2).toBe(SHARED);
    expect(breakdown.p1[0].reason).toBe('shared');
    expect(breakdown.p2[0].reason).toBe('shared');
  });
});
