import { describe, it, expect } from 'vitest';
import {
  LOCALE_POLICIES,
  resolveLocalePolicy,
  formatNumber,
  formatMoneyAmount,
  auditTranslationTree,
} from './locale';
import fa from '@/i18n/locales/fa.json';
import en from '@/i18n/locales/en.json';
import ar from '@/i18n/locales/ar.json';
import zh from '@/i18n/locales/zh.json';
import ru from '@/i18n/locales/ru.json';

describe('Locale & currency context (R7)', () => {
  it('every supported language has a complete policy', () => {
    for (const lang of ['fa', 'ar', 'en', 'zh', 'ru']) {
      const p = resolveLocalePolicy(lang);
      expect(p.intlTag).toBeTruthy();
      expect(p.defaultCurrency).toBeTruthy();
      expect(typeof p.isRTL).toBe('boolean');
    }
  });

  it('fa uses Persian digits + Jalali calendar + IRR; en uses latn + Gregorian + USD', () => {
    const fa = resolveLocalePolicy('fa');
    expect(fa.numberingSystem).toBe('arabext');
    expect(fa.calendar).toBe('JALALI');
    expect(fa.defaultCurrency).toBe('IRR');
    expect(fa.isRTL).toBe(true);

    const en = resolveLocalePolicy('en');
    expect(en.numberingSystem).toBe('latn');
    expect(en.calendar).toBe('GREGORIAN');
    expect(en.isRTL).toBe(false);
  });

  it('falls back to en policy for unknown languages (no throw)', () => {
    expect(resolveLocalePolicy('xx')).toEqual(LOCALE_POLICIES.en);
  });

  it('formats numbers with the right digit set per locale', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    // Persian digits with Persian thousand separators (٬)
    expect(formatNumber(1234567, 'fa')).toBe('۱٬۲۳۴٬۵۶۷');
    expect(formatNumber('45.5', 'en', { decimals: 2 })).toBe('45.50');
  });

  it('formats money amounts with per-currency decimals (IRR 0, USD 2)', () => {
    const usd = formatMoneyAmount('1234.5', 'USD', 'en');
    expect(usd).toBe('1,234.50');
    const irr = formatMoneyAmount('1234000', 'IRR', 'en');
    expect(irr).toBe('1,234,000'); // no decimals for IRR
  });
});

describe('Runtime translation audit (R7 missing-key guard)', () => {
  it('all five shipped locales are complete against the en reference', () => {
    const report = (c: Record<string, unknown>) => auditTranslationTree(en, c);
    expect(report(fa).missing).toEqual([]);
    expect(report(ar).missing).toEqual([]);
    expect(report(zh).missing).toEqual([]);
    expect(report(ru).missing).toEqual([]);
    // And no empty values anywhere
    expect(report(fa).empty).toEqual([]);
    expect(report(ru).empty).toEqual([]);
  });

  it('detects a missing key and an empty translation', () => {
    const candidate = {
      tabs: { home: 'خانه', search: '' }, // search empty; myTrips.. missing
    };
    const report = auditTranslationTree(en as unknown as Record<string, unknown>, candidate);
    expect(report.isComplete).toBe(false);
    expect(report.missing.length).toBeGreaterThan(0);
    expect(report.empty).toContain('tabs.search');
  });

  it('isComplete=true for a perfect mirror', () => {
    const report = auditTranslationTree(en, JSON.parse(JSON.stringify(en)));
    expect(report.isComplete).toBe(true);
  });
});
