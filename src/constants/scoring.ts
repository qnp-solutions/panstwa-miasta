import type { ScoringConstants } from '../types/game';

export const SCORING: ScoringConstants = {
  /** Only one player has this valid answer in the category */
  BONUS: 15,
  /** Player has a unique valid answer (others have different valid answers) */
  UNIQUE: 10,
  /** Multiple players share the same valid answer */
  SHARED: 5,
};
