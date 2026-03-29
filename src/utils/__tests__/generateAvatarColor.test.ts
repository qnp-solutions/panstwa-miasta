import { generateAvatarColor } from '../generateAvatarColor';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

describe('generateAvatarColor', () => {
  it('returns a valid 7-character hex color string', () => {
    expect(generateAvatarColor('user123')).toMatch(HEX_COLOR_REGEX);
  });

  it('is deterministic — same uid always returns the same color', () => {
    const uid = 'abc123';
    expect(generateAvatarColor(uid)).toBe(generateAvatarColor(uid));
  });

  it('is deterministic across multiple calls', () => {
    const uid = 'testUser';
    const results = Array.from({ length: 10 }, () => generateAvatarColor(uid));
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });

  it('starts with a hash character', () => {
    expect(generateAvatarColor('someUid')).toMatch(/^#/);
  });

  it('different uids can produce different colors', () => {
    // With 8 colors and random-looking uids this should hold for most inputs
    const colors = new Set([
      generateAvatarColor('uid0'),
      generateAvatarColor('uid1'),
      generateAvatarColor('uid2'),
      generateAvatarColor('uid3'),
      generateAvatarColor('uid4'),
      generateAvatarColor('uid5'),
      generateAvatarColor('uid6'),
      generateAvatarColor('uid7'),
    ]);
    expect(colors.size).toBeGreaterThanOrEqual(2);
  });

  it('handles empty string uid without throwing', () => {
    expect(() => generateAvatarColor('')).not.toThrow();
    expect(generateAvatarColor('')).toMatch(HEX_COLOR_REGEX);
  });

  it('handles a very long uid without throwing', () => {
    const longUid = 'a'.repeat(1000);
    expect(() => generateAvatarColor(longUid)).not.toThrow();
    expect(generateAvatarColor(longUid)).toMatch(HEX_COLOR_REGEX);
  });

  it('returns one of the predefined palette colors', () => {
    const PALETTE = [
      '#E63946', '#457B9D', '#2A9D8F', '#E9C46A',
      '#F4A261', '#A8DADC', '#6A4C93', '#52B788',
    ];
    const color = generateAvatarColor('testUser42');
    expect(PALETTE).toContain(color);
  });
});
