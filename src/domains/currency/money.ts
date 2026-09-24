import Decimal from 'decimal.js';

/**
 * Money invariant: NEVER use float/number for amounts.
 * All financial math goes through Decimal with fixed precision.
 */
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type CurrencyCode = 'IRR' | 'USD' | 'EUR' | 'AED' | 'CNY' | 'RUB';

const ZERO = new Decimal(0);

export interface Money {
  readonly amount: Decimal;
  readonly currency: CurrencyCode;
}

export function money(amount: string | number | Decimal, currency: CurrencyCode): Money {
  const d = new Decimal(amount);
  if (!d.isFinite()) {
    throw new Error(`Invalid money amount: ${amount}`);
  }
  return { amount: d, currency };
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount.plus(b.amount), currency: a.currency };
}

export function sub(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount.minus(b.amount), currency: a.currency };
}

export function mul(a: Money, qty: number): Money {
  return { amount: a.amount.times(qty), currency: a.currency };
}

export function convert(a: Money, rate: Decimal | string, to: CurrencyCode): Money {
  if (a.currency === to) return a;
  return { amount: a.amount.times(rate), currency: to };
}

/** Formats for display; decimals preserved exactly (e.g. $250.00, ۱٬۲۵۰٬۰۰۰). */
export function format(a: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: a.currency,
    useGrouping: true,
  }).format(a.amount.toNumber());
}

export function isEqual(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount.eq(b.amount);
}

export const zero = (currency: CurrencyCode): Money => ({ amount: ZERO, currency });

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
