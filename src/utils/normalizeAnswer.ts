/**
 * Normalizes an answer for comparison purposes.
 * - Lowercases and trims whitespace.
 * - Does NOT strip diacritics: "Kraków" ≠ "Krakow" is intentional.
 * - Collapses internal whitespace to single spaces.
 */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}
