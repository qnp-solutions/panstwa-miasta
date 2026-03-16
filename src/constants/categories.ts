/** Category keys (language-agnostic). Display names are in locales/{lang}/categories.json */
export const DEFAULT_CATEGORIES_PL = [
  'country',
  'city',
  'river',
  'plant',
  'animal',
  'name',
  'profession',
  'fruit',
] as const;

export const DEFAULT_CATEGORIES_EN = [
  'country',
  'city',
  'river',
  'plant',
  'animal',
  'name',
  'profession',
  'fruit',
] as const;

export type CategoryKey = (typeof DEFAULT_CATEGORIES_PL)[number];
