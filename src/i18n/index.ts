import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fa from './locales/fa.json';
import ar from './locales/ar.json';
import en from './locales/en.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';

export const RTL_LANGUAGES = ['fa', 'ar'] as const;
export const SUPPORTED_LANGUAGES = ['fa', 'ar', 'en', 'zh', 'ru'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  fa: 'فارسی',
  ar: 'العربية',
  en: 'English',
  zh: '中文',
  ru: 'Русский',
};

export function isRTL(language: string): boolean {
  return (RTL_LANGUAGES as readonly string[]).includes(language);
}

void i18n.use(initReactI18next).init({
  resources: {
    fa: { translation: fa },
    ar: { translation: ar },
    en: { translation: en },
    zh: { translation: zh },
    ru: { translation: ru },
  },
  lng: 'fa',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
