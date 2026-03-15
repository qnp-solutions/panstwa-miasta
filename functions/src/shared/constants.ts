import type { Language } from './types';

export const ROOM_CODE_LENGTH = 6;
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
export const DEFAULT_COUNTDOWN_SECONDS = 30;
export const VOTE_VALIDITY_THRESHOLD = 0.5;

export const SCORING = { BONUS: 15, UNIQUE: 10, SHARED: 5 };

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export const ALPHABETS: Record<Language, string[]> = {
  pl: ['A','Ą','B','C','Ć','D','E','Ę','F','G','H','I','J','K','L','Ł','M','N','Ń','O','Ó','P','R','S','Ś','T','U','W','Y','Z','Ź','Ż'],
  en: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','R','S','T','U','V','W'],
};

export function pickRandomLetter(language: Language, usedLetters: string[]): string | null {
  const available = ALPHABETS[language].filter((l) => !usedLetters.includes(l));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}
