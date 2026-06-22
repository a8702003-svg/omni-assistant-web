import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationZH from '../locales/zh-TW.json';
import translationEN from '../locales/en.json';
import translationJA from '../locales/ja.json';
import translationKO from '../locales/ko.json';

const resources = {
  'zh-TW': { translation: translationZH },
  'en': { translation: translationEN },
  'ja': { translation: translationJA },
  'ko': { translation: translationKO }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-TW',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
