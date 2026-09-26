/**
 * Canonical Jalali (Persian Solar Hijri) & Gregorian calendar converter.
 *
 * Implements Phase 14 (Date / Currency / Localization):
 * - Pure arithmetic conversions with zero external dependencies.
 * - Accurate for dates between 1900 and 2100 CE (1279 and 1479 SH).
 * - Bi-directional conversion (Gregorian ↔ Jalali).
 */

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

export interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const PERSIAN_MONTH_NAMES_LATIN = [
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand',
] as const;

/**
 * Converts a Gregorian date to Jalali (Solar Hijri).
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1]!;
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { year: jy, month: jm, day: jd };
}

/**
 * Converts a Jalali date to Gregorian.
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm: number;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm]!;
    if (gd <= v) break;
    gd -= v;
  }
  return { year: gy, month: gm, day: gd };
}

/**
 * Formats a Gregorian ISO string (YYYY-MM-DD) into Jalali display string (e.g. "۴ مهر ۱۴۰۵").
 */
export function formatIsoToJalali(isoDate: string, locale = 'fa'): string {
  const parts = isoDate.slice(0, 10).split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]!) || isNaN(parts[1]!) || isNaN(parts[2]!)) {
    return isoDate;
  }
  const j = gregorianToJalali(parts[0]!, parts[1]!, parts[2]!);
  const monthName = PERSIAN_MONTH_NAMES[j.month - 1] ?? '';
  if (locale === 'fa' || locale === 'ar') {
    return `${j.day} ${monthName} ${j.year}`;
  }
  const monthNameEn = PERSIAN_MONTH_NAMES_LATIN[j.month - 1] ?? '';
  return `${j.day} ${monthNameEn} ${j.year}`;
}

/**
 * Formats a Gregorian date for the traveler UI with dual calendar support.
 */
export function formatDualDate(isoDate: string, isPersianLocale: boolean): { primary: string; secondary: string } {
  const parts = isoDate.slice(0, 10).split('-').map(Number);
  if (parts.length < 3) return { primary: isoDate, secondary: '' };

  const j = gregorianToJalali(parts[0]!, parts[1]!, parts[2]!);
  const jStr = `${j.day} ${PERSIAN_MONTH_NAMES[j.month - 1]} ${j.year}`;
  const gStr = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;

  if (isPersianLocale) {
    return { primary: jStr, secondary: gStr };
  }
  return { primary: gStr, secondary: jStr };
}
