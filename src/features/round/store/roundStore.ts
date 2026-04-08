import { create } from 'zustand';
import type { RoundDocument } from '../../../types/firebase';

interface RoundState {
  round: RoundDocument | null;
  /** Local draft answers the player is typing (not yet submitted) */
  localAnswers: Record<string, string>;
  /** Currently selected category index */
  activeCategoryIndex: number;
  /** Whether the player has submitted this round */
  submitted: boolean;
  setRound: (round: RoundDocument | null) => void;
  setLocalAnswer: (category: string, value: string) => void;
  setActiveCategoryIndex: (index: number) => void;
  setSubmitted: (submitted: boolean) => void;
  initLocalAnswers: (categories: string[]) => void;
  reset: () => void;
}

export const useRoundStore = create<RoundState>((set) => ({
  round: null,
  localAnswers: {},
  activeCategoryIndex: 0,
  submitted: false,
  setRound: (round) => set({ round }),
  setLocalAnswer: (category, value) =>
    set((state) => ({
      localAnswers: { ...state.localAnswers, [category]: value },
    })),
  setActiveCategoryIndex: (index) => set({ activeCategoryIndex: index }),
  setSubmitted: (submitted) => set({ submitted }),
  initLocalAnswers: (categories) =>
    set({
      localAnswers: Object.fromEntries(categories.map((c) => [c, ''])),
      activeCategoryIndex: 0,
      submitted: false,
    }),
  reset: () =>
    set({
      round: null,
      localAnswers: {},
      activeCategoryIndex: 0,
      submitted: false,
    }),
}));
