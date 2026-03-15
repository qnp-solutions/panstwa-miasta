import type { Language } from '../types/game';

/** Letters used for each language. Excludes rare/unused letters. */
export const ALPHABETS: Record<Language, string[]> = {
  pl: [
    'A', 'Ą', 'B', 'C', 'Ć', 'D', 'E', 'Ę', 'F', 'G', 'H', 'I', 'J', 'K',
    'L', 'Ł', 'M', 'N', 'Ń', 'O', 'Ó', 'P', 'R', 'S', 'Ś', 'T', 'U', 'W',
    'Y', 'Z', 'Ź', 'Ż',
  ],
  en: [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W',
  ],
};
