import { normalizeAnswer } from '../normalizeAnswer';

describe('normalizeAnswer', () => {
  it('trims leading whitespace', () => {
    expect(normalizeAnswer('  Polska')).toBe('polska');
  });

  it('trims trailing whitespace', () => {
    expect(normalizeAnswer('Polska  ')).toBe('polska');
  });

  it('trims both sides', () => {
    expect(normalizeAnswer('  Polska  ')).toBe('polska');
  });

  it('lowercases ASCII letters', () => {
    expect(normalizeAnswer('POLSKA')).toBe('polska');
  });

  it('lowercases mixed-case input', () => {
    expect(normalizeAnswer('PoLsKa')).toBe('polska');
  });

  it('collapses multiple internal spaces to one', () => {
    expect(normalizeAnswer('Nowa  Huta')).toBe('nowa huta');
  });

  it('collapses tab characters to single space', () => {
    expect(normalizeAnswer('Nowa\tHuta')).toBe('nowa huta');
  });

  it('collapses mixed whitespace to single space', () => {
    expect(normalizeAnswer('Nowa \t Huta')).toBe('nowa huta');
  });

  it('preserves Polish diacritics — ó', () => {
    expect(normalizeAnswer('Kraków')).toBe('kraków');
  });

  it('preserves Polish diacritics — ą ę ś ź ż ń ć ł', () => {
    expect(normalizeAnswer('Żółw')).toBe('żółw');
  });

  it('Kraków ≠ Krakow after normalization', () => {
    expect(normalizeAnswer('Kraków')).not.toBe(normalizeAnswer('Krakow'));
  });

  it('returns empty string unchanged for empty input', () => {
    expect(normalizeAnswer('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeAnswer('   ')).toBe('');
  });

  it('handles a single word with no changes needed', () => {
    expect(normalizeAnswer('polska')).toBe('polska');
  });
});
