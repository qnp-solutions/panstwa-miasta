const AVATAR_COLORS = [
  '#E63946', '#457B9D', '#2A9D8F', '#E9C46A',
  '#F4A261', '#A8DADC', '#6A4C93', '#52B788',
];

export function generateAvatarColor(uid: string): string {
  const index = uid.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
