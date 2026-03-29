// Zustand store tests — no Firebase SDK calls; we just exercise the store's
// pure state-mutation actions.

// jest.mock is NOT needed here because authStore.ts does not call any Firebase
// functions at module-load time — it only imports the `User` type from
// 'firebase/auth', which is a type-only import erased by TypeScript.

import { useAuthStore } from '../authStore';

// Helper: reset store to initial state before each test
function resetStore() {
  useAuthStore.setState({
    user: null,
    nickname: '',
    isLoading: false,
    isInitialized: false,
  });
}

describe('useAuthStore', () => {
  beforeEach(resetStore);

  // ── initial state ──────────────────────────────────────────────────────────

  it('starts with user null', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('starts with empty nickname', () => {
    expect(useAuthStore.getState().nickname).toBe('');
  });

  it('starts with isLoading false', () => {
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('starts with isInitialized false', () => {
    expect(useAuthStore.getState().isInitialized).toBe(false);
  });

  // ── setUser ────────────────────────────────────────────────────────────────

  it('setUser stores the provided user object', () => {
    const fakeUser = { uid: 'user-1', email: 'test@example.com' } as never;
    useAuthStore.getState().setUser(fakeUser);
    expect(useAuthStore.getState().user).toBe(fakeUser);
  });

  it('setUser(null) clears the user', () => {
    const fakeUser = { uid: 'user-1' } as never;
    useAuthStore.getState().setUser(fakeUser);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });

  // ── setNickname ────────────────────────────────────────────────────────────

  it('setNickname stores the provided nickname', () => {
    useAuthStore.getState().setNickname('Gracz123');
    expect(useAuthStore.getState().nickname).toBe('Gracz123');
  });

  it('setNickname can be updated multiple times', () => {
    useAuthStore.getState().setNickname('first');
    useAuthStore.getState().setNickname('second');
    expect(useAuthStore.getState().nickname).toBe('second');
  });

  it('setNickname accepts empty string', () => {
    useAuthStore.getState().setNickname('Gracz');
    useAuthStore.getState().setNickname('');
    expect(useAuthStore.getState().nickname).toBe('');
  });

  // ── setLoading ─────────────────────────────────────────────────────────────

  it('setLoading(true) sets isLoading to true', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it('setLoading(false) sets isLoading to false', () => {
    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  // ── setInitialized ─────────────────────────────────────────────────────────

  it('setInitialized sets isInitialized to true', () => {
    useAuthStore.getState().setInitialized();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('setInitialized is idempotent', () => {
    useAuthStore.getState().setInitialized();
    useAuthStore.getState().setInitialized();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  // ── combined state mutations don't clobber each other ─────────────────────

  it('mutations are independent and do not reset other fields', () => {
    useAuthStore.getState().setNickname('TestPlayer');
    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().setInitialized();

    const state = useAuthStore.getState();
    expect(state.nickname).toBe('TestPlayer');
    expect(state.isLoading).toBe(true);
    expect(state.isInitialized).toBe(true);
  });
});
