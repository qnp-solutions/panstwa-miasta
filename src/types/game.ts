import type { RoomDocument, RoundDocument, PlayerSummary } from './firebase';

export type { RoomStatus, RoundStatus, VoteValue, Language } from './firebase';

/** Hydrated room data used throughout the app (same shape as Firestore doc) */
export type Room = RoomDocument;

/** Hydrated round data */
export type Round = RoundDocument;

/** Single player entry (derived from Room.players map) */
export type Player = PlayerSummary;

/** Scoring constants */
export interface ScoringConstants {
  UNIQUE: number;
  SHARED: number;
  BONUS: number;
}

/** Per-category scoring result for a single player */
export interface CategoryScore {
  categoryKey: string;
  answer: string;
  points: number;
  reason: 'unique' | 'shared' | 'bonus' | 'invalid' | 'empty';
}
