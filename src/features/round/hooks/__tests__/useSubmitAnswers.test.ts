/**
 * Smoke tests for useSubmitAnswers.
 *
 * useSubmitAnswers depends on Firebase services (submitAnswers), react-i18next,
 * and multiple Zustand stores. We mock the external dependencies at module
 * level and only verify that the hook is exported with the correct shape.
 * Deep integration behaviour is covered by e2e / emulator tests.
 */

// Mock react-i18next so the module can be loaded in a Node test environment
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock the roomService to avoid Firebase calls at module load time
jest.mock('../../../room/services/roomService', () => ({
  submitAnswers: jest.fn(),
}));

// Mock the firebase errors helper
jest.mock('../../../../services/firebase/errors', () => ({
  getErrorKey: jest.fn((err: unknown) => 'errors.unknown'),
}));

describe('useSubmitAnswers module', () => {
  it('exports useSubmitAnswers as a named export', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../useSubmitAnswers');
    expect(mod).toHaveProperty('useSubmitAnswers');
  });

  it('useSubmitAnswers is a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useSubmitAnswers } = require('../useSubmitAnswers');
    expect(typeof useSubmitAnswers).toBe('function');
  });
});
