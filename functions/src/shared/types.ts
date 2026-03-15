import type { Timestamp } from 'firebase-admin/firestore';

// Mirrors src/types/firebase.ts — kept in sync manually
// (shared npm package can be introduced later if needed)

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
  answers: Record<string, string>;
  submittedAt: Timestamp | null;
  finishedFirst: boolean;
}

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

export interface RoundDocument {
  roundIndex: number;
  letter: string;
  status: RoundStatus;
  startedAt: Timestamp;
  firstFinishedAt: Timestamp | null;
  countdownEndsAt: Timestamp | null;
  endedAt: Timestamp | null;
  playerAnswers: Record<string, PlayerAnswers>;
  scores: Record<string, number> | null;
}

export interface VoteDocument {
  voterUid: string;
  votes: Record<string, VoteValue>;
  submittedAt: Timestamp;
}
