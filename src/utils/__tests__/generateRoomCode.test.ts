import { generateRoomCode } from '../generateRoomCode';

const AMBIGUOUS_CHARS = new Set(['O', '0', 'I', '1']);
const VALID_CHARS = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;

describe('generateRoomCode', () => {
  it('returns a string of exactly 6 characters', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it('contains only uppercase alphanumeric characters from the safe set', () => {
    const code = generateRoomCode();
    expect(code).toMatch(VALID_CHARS);
  });

  it('does not contain ambiguous character O', () => {
    // Run many times to reduce false-negative probability
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).not.toContain('O');
    }
  });

  it('does not contain ambiguous character 0 (zero)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).not.toContain('0');
    }
  });

  it('does not contain ambiguous character I (capital i)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).not.toContain('I');
    }
  });

  it('does not contain ambiguous character 1 (one)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).not.toContain('1');
    }
  });

  it('produces different codes across multiple calls (non-deterministic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()));
    // With 32^6 ≈ 1 billion combinations, getting 20 identical codes is astronomically unlikely
    expect(codes.size).toBeGreaterThan(1);
  });

  it('contains no lowercase letters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toBe(code.toUpperCase());
    }
  });
});
