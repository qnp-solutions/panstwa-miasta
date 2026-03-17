import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import plCommon from '../locales/pl/common.json';
import plGame from '../locales/pl/game.json';
import plCategories from '../locales/pl/categories.json';
import enCommon from '../locales/en/common.json';
import enGame from '../locales/en/game.json';
import enCategories from '../locales/en/categories.json';

const deviceLang = getLocales()[0]?.languageCode ?? 'en';
const supportedLangs = ['pl', 'en'];
const fallbackLng = supportedLangs.includes(deviceLang) ? deviceLang : 'en';

i18n.use(initReactI18next).init({
  resources: {
    pl: { common: plCommon, game: plGame, categories: plCategories },
    en: { common: enCommon, game: enGame, categories: enCategories },
  },
  lng: fallbackLng,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export { i18n };
