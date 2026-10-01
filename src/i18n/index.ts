import { I18nManager } from 'react-native';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';

import fa from './locales/fa.json';
import ar from './locales/ar.json';
import en from './locales/en.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';

export const RTL_LANGUAGES = ['fa', 'ar'] as const;
export const SUPPORTED_LANGUAGES = ['fa', 'ar', 'en', 'zh', 'ru'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Persisted app-language preference (SecureStore-backed). Deliberately NOT in
 * the logout wipe list — the language choice must survive logout/login.
 */
export const LANGUAGE_STORAGE_KEY = 'app.language';

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

/**
 * §4 RTL/LTR runtime orchestration: fa/ar force RTL, all others force LTR.
 * React Native only re-evaluates the layout direction on the next process
 * start, so after changing language callers MUST pair this with a restart
 * prompt (see AccountScreen.handleLanguageChange). The native flag itself
 * persists across restarts (Keystore-independent platform preference).
 */
export function applyLanguageDirection(language: string): void {
  const rtl = isRTL(language);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

/**
 * Direction-aware navigation arrow (§4.2 flip list). Use ONLY for navigation
 * affordances (back/next pointers). Route, flight-direction and currency-pair
 * arrows follow international convention and must NEVER use this.
 */
export function dirArrow(isRtl: boolean): string {
  return isRtl ? '←' : '→';
}

/**
 * Wrap text in an LTR bidi isolate (LRI…PDI) — for §4.3 invariant data
 * (flight numbers, IATA codes, card numbers) rendered inside Text nodes that
 * cannot receive a `writingDirection` style (e.g. Badge labels).
 */
export function ltrIsolate(text: string): string {
  return `\u2066${text}\u2069`;
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

// Apply the direction for the default language immediately.
applyLanguageDirection(i18n.language);

// Restore the persisted language fire-and-forget: SecureStore is async while
// init must stay synchronous. react-i18next re-renders every subscriber on
// `languageChanged`, so screens converge without a restart; the RTL/LTR flag
// was already persisted natively by the session that changed the language.
void (async () => {
  try {
    const stored = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    if (
      stored &&
      (SUPPORTED_LANGUAGES as readonly string[]).includes(stored) &&
      stored !== i18n.language
    ) {
      await i18n.changeLanguage(stored);
      applyLanguageDirection(stored);
    }
  } catch {
    // Preference unavailable (fresh install / storage error) — keep default.
  }
})();

export default i18n;
