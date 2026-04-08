import { useRoundStore } from '../roundStore';

// Helper to get a clean store state for each test
function getStore() {
  return useRoundStore;
}

// Reset the store before each test so tests are isolated
beforeEach(() => {
  useRoundStore.getState().reset();
});

const mockRound = {
  roundIndex: 1,
  letter: 'K',
  status: 'active' as const,
  startedAt: { seconds: 1000, nanoseconds: 0 } as any,
  firstFinishedAt: null,
  countdownEndsAt: null,
  endedAt: null,
  playerAnswers: {},
  scores: null,
  scoreBreakdown: null,
};

describe('roundStore', () => {
  describe('initial state', () => {
    it('has round as null', () => {
      const { round } = useRoundStore.getState();
      expect(round).toBeNull();
    });

    it('has localAnswers as empty object', () => {
      const { localAnswers } = useRoundStore.getState();
      expect(localAnswers).toEqual({});
    });

    it('has activeCategoryIndex as 0', () => {
      const { activeCategoryIndex } = useRoundStore.getState();
      expect(activeCategoryIndex).toBe(0);
    });

    it('has submitted as false', () => {
      const { submitted } = useRoundStore.getState();
      expect(submitted).toBe(false);
    });
  });

  describe('setRound', () => {
    it('sets round data', () => {
      useRoundStore.getState().setRound(mockRound);
      expect(useRoundStore.getState().round).toEqual(mockRound);
    });

    it('sets round back to null', () => {
      useRoundStore.getState().setRound(mockRound);
      useRoundStore.getState().setRound(null);
      expect(useRoundStore.getState().round).toBeNull();
    });
  });

  describe('setLocalAnswer', () => {
    it('updates a single category value', () => {
      useRoundStore.getState().setLocalAnswer('country', 'Kenia');
      expect(useRoundStore.getState().localAnswers).toEqual({ country: 'Kenia' });
    });

    it('updates only the specified category without clobbering others', () => {
      useRoundStore.getState().setLocalAnswer('country', 'Kenia');
      useRoundStore.getState().setLocalAnswer('city', 'Kraków');
      const { localAnswers } = useRoundStore.getState();
      expect(localAnswers.country).toBe('Kenia');
      expect(localAnswers.city).toBe('Kraków');
    });

    it('overwrites an existing category value', () => {
      useRoundStore.getState().setLocalAnswer('country', 'Kenia');
      useRoundStore.getState().setLocalAnswer('country', 'Kongo');
      expect(useRoundStore.getState().localAnswers.country).toBe('Kongo');
    });

    it('multiple calls preserve all previously set categories', () => {
      const categories = ['country', 'city', 'river', 'plant', 'animal', 'name'];
      categories.forEach((cat, i) => {
        useRoundStore.getState().setLocalAnswer(cat, `answer_${i}`);
      });
      const { localAnswers } = useRoundStore.getState();
      categories.forEach((cat, i) => {
        expect(localAnswers[cat]).toBe(`answer_${i}`);
      });
    });
  });

  describe('setActiveCategoryIndex', () => {
    it('updates the active category index', () => {
      useRoundStore.getState().setActiveCategoryIndex(3);
      expect(useRoundStore.getState().activeCategoryIndex).toBe(3);
    });

    it('can set index to 0', () => {
      useRoundStore.getState().setActiveCategoryIndex(5);
      useRoundStore.getState().setActiveCategoryIndex(0);
      expect(useRoundStore.getState().activeCategoryIndex).toBe(0);
    });
  });

  describe('setSubmitted', () => {
    it('sets submitted to true', () => {
      useRoundStore.getState().setSubmitted(true);
      expect(useRoundStore.getState().submitted).toBe(true);
    });

    it('sets submitted back to false', () => {
      useRoundStore.getState().setSubmitted(true);
      useRoundStore.getState().setSubmitted(false);
      expect(useRoundStore.getState().submitted).toBe(false);
    });
  });

  describe('initLocalAnswers', () => {
    it('creates an empty string entry for each category', () => {
      const categories = ['country', 'city', 'river'];
      useRoundStore.getState().initLocalAnswers(categories);
      expect(useRoundStore.getState().localAnswers).toEqual({
        country: '',
        city: '',
        river: '',
      });
    });

    it('resets activeCategoryIndex to 0', () => {
      useRoundStore.getState().setActiveCategoryIndex(4);
      useRoundStore.getState().initLocalAnswers(['country', 'city']);
      expect(useRoundStore.getState().activeCategoryIndex).toBe(0);
    });

    it('resets submitted to false', () => {
      useRoundStore.getState().setSubmitted(true);
      useRoundStore.getState().initLocalAnswers(['country', 'city']);
      expect(useRoundStore.getState().submitted).toBe(false);
    });

    it('overwrites previously set localAnswers', () => {
      useRoundStore.getState().setLocalAnswer('country', 'Kenia');
      useRoundStore.getState().initLocalAnswers(['city', 'river']);
      expect(useRoundStore.getState().localAnswers).toEqual({
        city: '',
        river: '',
      });
    });

    it('handles empty categories array', () => {
      useRoundStore.getState().initLocalAnswers([]);
      expect(useRoundStore.getState().localAnswers).toEqual({});
    });
  });

  describe('reset', () => {
    it('clears round to null', () => {
      useRoundStore.getState().setRound(mockRound);
      useRoundStore.getState().reset();
      expect(useRoundStore.getState().round).toBeNull();
    });

    it('clears localAnswers to empty object', () => {
      useRoundStore.getState().setLocalAnswer('country', 'Kenia');
      useRoundStore.getState().reset();
      expect(useRoundStore.getState().localAnswers).toEqual({});
    });

    it('resets activeCategoryIndex to 0', () => {
      useRoundStore.getState().setActiveCategoryIndex(5);
      useRoundStore.getState().reset();
      expect(useRoundStore.getState().activeCategoryIndex).toBe(0);
    });

    it('resets submitted to false', () => {
      useRoundStore.getState().setSubmitted(true);
      useRoundStore.getState().reset();
      expect(useRoundStore.getState().submitted).toBe(false);
    });

    it('resets all fields together', () => {
      useRoundStore.getState().setRound(mockRound);
      useRoundStore.getState().setLocalAnswer('country', 'Kenia');
      useRoundStore.getState().setActiveCategoryIndex(3);
      useRoundStore.getState().setSubmitted(true);
      useRoundStore.getState().reset();

      const state = useRoundStore.getState();
      expect(state.round).toBeNull();
      expect(state.localAnswers).toEqual({});
      expect(state.activeCategoryIndex).toBe(0);
      expect(state.submitted).toBe(false);
    });
  });
});
