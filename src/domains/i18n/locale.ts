import type { CurrencyCode } from '@/domains/currency/money';

/**
 * Locale & Country Context (R7 — Country + Currency + i18n).
 *
 * Pure policy for locale-aware presentation. NO UI imports — testable
 * headlessly. The business rules (which currency a country settles in,
 * which calendar applies) live here so adding a new country/locale
 * requires DATA, not forks.
 */

export type CalendarSystem = 'GREGORIAN' | 'JALALI';

export interface LocalePolicy {
  language: string;
  /** BCP-47 tag used for Intl.NumberFormat/DateTimeFormat. */
  intlTag: string;
  /** Native digits: 'latn' (0-9) or localized digit sets. */
  numberingSystem: 'latn' | 'arabext' | 'arab' | 'hanidec';
  calendar: CalendarSystem;
  /** Default settlement currency for pricing display. */
  defaultCurrency: CurrencyCode;
  isRTL: boolean;
}

export const LOCALE_POLICIES: Record<string, LocalePolicy> = {
  fa: {
    language: 'fa',
    intlTag: 'fa-IR',
    numberingSystem: 'arabext', // ۰۱۲۳۴۵۶۷۸۹
    calendar: 'JALALI',
    defaultCurrency: 'IRR',
    isRTL: true,
  },
  ar: {
    language: 'ar',
    intlTag: 'ar-AE',
    numberingSystem: 'arab', // ٠١٢٣٤٥٦٧٨٩
    calendar: 'GREGORIAN',
    defaultCurrency: 'AED',
    isRTL: true,
  },
  en: {
    language: 'en',
    intlTag: 'en-US',
    numberingSystem: 'latn',
    calendar: 'GREGORIAN',
    defaultCurrency: 'USD',
    isRTL: false,
  },
  zh: {
    language: 'zh',
    intlTag: 'zh-CN',
    numberingSystem: 'latn',
    calendar: 'GREGORIAN',
    defaultCurrency: 'CNY',
    isRTL: false,
  },
  ru: {
    language: 'ru',
    intlTag: 'ru-RU',
    numberingSystem: 'latn',
    calendar: 'GREGORIAN',
    defaultCurrency: 'RUB',
    isRTL: false,
  },
};

export function resolveLocalePolicy(language: string): LocalePolicy {
  return LOCALE_POLICIES[language] ?? LOCALE_POLICIES.en!;
}

/**
 * Locale-aware number formatting with the correct digit set.
 * Financial figures keep LTR isolation concerns in the UI layer; this
 * only formats the numeric string.
 */
export function formatNumber(
  value: number | string,
  language: string,
  opts: { decimals?: number; useGrouping?: boolean } = {},
): string {
  const policy = resolveLocalePolicy(language);
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat(policy.intlTag, {
    numberingSystem: policy.numberingSystem,
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 2,
    useGrouping: opts.useGrouping ?? true,
  }).format(num);
}

/**
 * Currency-amount formatting per locale policy (no style:'currency' so
 * Rial/Toman quirks don't produce wrong symbols; the UI prefixes codes).
 */
export function formatMoneyAmount(
  amount: string | number,
  currency: CurrencyCode,
  language: string,
): string {
  const decimals = currency === 'IRR' ? 0 : 2;
  return formatNumber(amount, language, { decimals, useGrouping: true });
}

// ---------------------------------------------------------------------------
// Runtime missing-key guard (R7) — translation completeness enforcement
// ---------------------------------------------------------------------------

export interface MissingKeyReport {
  missing: string[];
  /** Keys present but resolved to empty strings. */
  empty: string[];
  isComplete: boolean;
}

/**
 * Walks a reference key tree against a candidate translation tree.
 * `runtimeTranslations` is the merged resource of the ACTIVE language.
 * Intended for debug builds and the E2E harness; production keeps the
 * fallback chain (missing key → en) but logs a telemetry breadcrumb.
 */
export function auditTranslationTree(
  reference: Record<string, unknown>,
  candidate: Record<string, unknown>,
  prefix = '',
): MissingKeyReport {
  const missing: string[] = [];
  const empty: string[] = [];

  const walk = (ref: Record<string, unknown>, cand: Record<string, unknown>, path: string): void => {
    for (const key of Object.keys(ref)) {
      const full = path ? `${path}.${key}` : key;
      const refVal = ref[key];
      const candVal = cand[key];
      if (candVal === undefined) {
        missing.push(full);
        continue;
      }
      if (typeof refVal === 'object' && refVal !== null && candVal !== null && typeof candVal === 'object') {
        walk(refVal as Record<string, unknown>, candVal as Record<string, unknown>, full);
      } else if (typeof candVal === 'string' && candVal.trim() === '') {
        empty.push(full);
      }
    }
  };

  walk(reference, candidate, prefix);
  return { missing, empty, isComplete: missing.length === 0 && empty.length === 0 };
}
