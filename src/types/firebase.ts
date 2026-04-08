import { Timestamp } from 'firebase/firestore';

// ─── Enums / Unions ────────────────────────────────────────────────────────────

export type RoomStatus =
  | 'lobby'
  | 'round_active'
  | 'countdown'
  | 'voting'
  | 'scoring'
  | 'results'
  | 'game_over';

export type RoundStatus = 'active' | 'countdown' | 'voting' | 'scored';

export type VoteValue = 'valid' | 'invalid' | 'abstain';

export type Language = 'pl' | 'en';

// ─── Sub-shapes ────────────────────────────────────────────────────────────────

export interface PlayerSummary {
  uid: string;
  nickname: string;
  avatarColor: string;
  totalScore: number;
  isOnline: boolean;
  isHost: boolean;
  joinedAt: Timestamp;
}

export interface PlayerAnswers {
  uid: string;
  /** Map of categoryKey → answer string (empty string if not answered) */
  answers: Record<string, string>;
  submittedAt: Timestamp | null;
  finishedFirst: boolean;
}

// ─── Firestore Documents ───────────────────────────────────────────────────────

/** /rooms/{roomCode} */
export interface RoomDocument {
  roomCode: string;
  hostUid: string;
  status: RoomStatus;
  currentRound: number;
  totalRounds: number;
  countdownDuration: number;
  categories: string[];
  language: Language;
  usedLetters: string[];
  players: Record<string, PlayerSummary>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Per-category scoring breakdown stored by processVotes CF */
export interface StoredCategoryBreakdown {
  answer: string;
  points: number;
  reason: 'unique' | 'shared' | 'bonus' | 'invalid' | 'empty' | 'vote_tie';
  validVotes: number;
  invalidVotes: number;
}

/** /rooms/{roomCode}/rounds/{roundIndex} */
export interface RoundDocument {
  roundIndex: number;
  letter: string;
  status: RoundStatus;
  startedAt: Timestamp;
  firstFinishedAt: Timestamp | null;
  countdownEndsAt: Timestamp | null;
  endedAt: Timestamp | null;
  playerAnswers: Record<string, PlayerAnswers>;
  /** null until scoring is complete */
  scores: Record<string, number> | null;
  /** Per-player per-category breakdown, set by processVotes CF alongside scores */
  scoreBreakdown: Record<string, StoredCategoryBreakdown[]> | null;
}

/** /rooms/{roomCode}/rounds/{roundIndex}/votes/{voterUid} */
export interface VoteDocument {
  voterUid: string;
  /** key format: "{targetUid}_{categoryKey}" */
  votes: Record<string, VoteValue>;
  submittedAt: Timestamp;
}
