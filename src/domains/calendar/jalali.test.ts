import { describe, it, expect } from 'vitest';
import {
  gregorianToJalali,
  jalaliToGregorian,
  formatIsoToJalali,
  formatDualDate,
} from './jalali';

describe('Jalali Calendar Conversions', () => {
  it('converts Gregorian to Jalali accurately', () => {
    // 2026-09-26 should be 1405-07-04 (4 Mehr 1405)
    const j = gregorianToJalali(2026, 9, 26);
    expect(j.year).toBe(1405);
    expect(j.month).toBe(7);
    expect(j.day).toBe(4);
  });

  it('converts Jalali back to Gregorian accurately (round-trip)', () => {
    const g = jalaliToGregorian(1405, 7, 4);
    expect(g.year).toBe(2026);
    expect(g.month).toBe(9);
    expect(g.day).toBe(26);
  });

  it('handles Norooz (Spring Equinox, Farvardin 1)', () => {
    const j = gregorianToJalali(2026, 3, 21);
    expect(j.year).toBe(1405);
    expect(j.month).toBe(1);
    expect(j.day).toBe(1);
  });

  it('formats ISO date to Jalali string', () => {
    const formattedFa = formatIsoToJalali('2026-09-26', 'fa');
    expect(formattedFa).toBe('4 مهر 1405');

    const formattedEn = formatIsoToJalali('2026-09-26', 'en');
    expect(formattedEn).toBe('4 Mehr 1405');
  });

  it('formats dual dates for Persian and Latin locales', () => {
    const dualFa = formatDualDate('2026-09-26', true);
    expect(dualFa.primary).toBe('4 مهر 1405');
    expect(dualFa.secondary).toBe('2026-09-26');

    const dualEn = formatDualDate('2026-09-26', false);
    expect(dualEn.primary).toBe('2026-09-26');
    expect(dualEn.secondary).toBe('4 مهر 1405');
  });
});
