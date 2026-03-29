// Zustand store tests — exercises pure state-mutation actions in roomStore.

import { useRoomStore } from '../roomStore';
import type { RoomDocument } from '../../../../types/firebase';

// Minimal valid RoomDocument stub (Timestamp fields not needed for store tests)
const NULL_TIMESTAMP = null as unknown as import('firebase/firestore').Timestamp;

function makeRoom(overrides?: Partial<RoomDocument>): RoomDocument {
  return {
    roomCode: 'ABC123',
    hostUid: 'host-uid',
    status: 'lobby',
    currentRound: 0,
    totalRounds: 5,
    countdownDuration: 30,
    categories: ['country', 'city', 'animal'],
    language: 'pl',
    usedLetters: [],
    players: {},
    createdAt: NULL_TIMESTAMP,
    updatedAt: NULL_TIMESTAMP,
    ...overrides,
  };
}

function resetStore() {
  useRoomStore.setState({
    room: null,
    roomCode: null,
    isLoading: false,
    error: null,
  });
}

describe('useRoomStore', () => {
  beforeEach(resetStore);

  // ── initial state ──────────────────────────────────────────────────────────

  it('starts with room null', () => {
    expect(useRoomStore.getState().room).toBeNull();
  });

  it('starts with roomCode null', () => {
    expect(useRoomStore.getState().roomCode).toBeNull();
  });

  it('starts with isLoading false', () => {
    expect(useRoomStore.getState().isLoading).toBe(false);
  });

  it('starts with error null', () => {
    expect(useRoomStore.getState().error).toBeNull();
  });

  // ── setRoom ────────────────────────────────────────────────────────────────

  it('setRoom stores the provided room document', () => {
    const room = makeRoom();
    useRoomStore.getState().setRoom(room);
    expect(useRoomStore.getState().room).toBe(room);
  });

  it('setRoom(null) clears the room', () => {
    useRoomStore.getState().setRoom(makeRoom());
    useRoomStore.getState().setRoom(null);
    expect(useRoomStore.getState().room).toBeNull();
  });

  it('setRoom updates individual fields on the stored document', () => {
    const room = makeRoom({ status: 'lobby' });
    useRoomStore.getState().setRoom(room);

    const updatedRoom = { ...room, status: 'round_active' as const };
    useRoomStore.getState().setRoom(updatedRoom);
    expect(useRoomStore.getState().room?.status).toBe('round_active');
  });

  // ── setRoomCode ────────────────────────────────────────────────────────────

  it('setRoomCode stores the provided code string', () => {
    useRoomStore.getState().setRoomCode('XYZ789');
    expect(useRoomStore.getState().roomCode).toBe('XYZ789');
  });

  it('setRoomCode(null) clears the room code', () => {
    useRoomStore.getState().setRoomCode('XYZ789');
    useRoomStore.getState().setRoomCode(null);
    expect(useRoomStore.getState().roomCode).toBeNull();
  });

  it('setRoomCode can be updated multiple times', () => {
    useRoomStore.getState().setRoomCode('FIRST1');
    useRoomStore.getState().setRoomCode('SECND2');
    expect(useRoomStore.getState().roomCode).toBe('SECND2');
  });

  // ── setLoading ─────────────────────────────────────────────────────────────

  it('setLoading(true) sets isLoading to true', () => {
    useRoomStore.getState().setLoading(true);
    expect(useRoomStore.getState().isLoading).toBe(true);
  });

  it('setLoading(false) sets isLoading to false', () => {
    useRoomStore.getState().setLoading(true);
    useRoomStore.getState().setLoading(false);
    expect(useRoomStore.getState().isLoading).toBe(false);
  });

  // ── setError ───────────────────────────────────────────────────────────────

  it('setError stores an error message string', () => {
    useRoomStore.getState().setError('Room not found');
    expect(useRoomStore.getState().error).toBe('Room not found');
  });

  it('setError(null) clears the error', () => {
    useRoomStore.getState().setError('Some error');
    useRoomStore.getState().setError(null);
    expect(useRoomStore.getState().error).toBeNull();
  });

  it('setError can be updated multiple times', () => {
    useRoomStore.getState().setError('first error');
    useRoomStore.getState().setError('second error');
    expect(useRoomStore.getState().error).toBe('second error');
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  it('reset clears room to null', () => {
    useRoomStore.getState().setRoom(makeRoom());
    useRoomStore.getState().reset();
    expect(useRoomStore.getState().room).toBeNull();
  });

  it('reset clears roomCode to null', () => {
    useRoomStore.getState().setRoomCode('ABCDEF');
    useRoomStore.getState().reset();
    expect(useRoomStore.getState().roomCode).toBeNull();
  });

  it('reset sets isLoading to false', () => {
    useRoomStore.getState().setLoading(true);
    useRoomStore.getState().reset();
    expect(useRoomStore.getState().isLoading).toBe(false);
  });

  it('reset clears error to null', () => {
    useRoomStore.getState().setError('some error');
    useRoomStore.getState().reset();
    expect(useRoomStore.getState().error).toBeNull();
  });

  it('reset restores full initial state at once', () => {
    useRoomStore.getState().setRoom(makeRoom());
    useRoomStore.getState().setRoomCode('ABCDEF');
    useRoomStore.getState().setLoading(true);
    useRoomStore.getState().setError('boom');
    useRoomStore.getState().reset();

    const state = useRoomStore.getState();
    expect(state.room).toBeNull();
    expect(state.roomCode).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  // ── mutations don't clobber unrelated fields ───────────────────────────────

  it('setRoom does not reset roomCode or isLoading', () => {
    useRoomStore.getState().setRoomCode('ABCDEF');
    useRoomStore.getState().setLoading(true);
    useRoomStore.getState().setRoom(makeRoom());

    const state = useRoomStore.getState();
    expect(state.roomCode).toBe('ABCDEF');
    expect(state.isLoading).toBe(true);
  });
});
