import Decimal from 'decimal.js';
import { money, add, mul, convert, type Money, type CurrencyCode } from '../currency/money';

/**
 * Pricing engine — decomposes a fare/room rate into its financial parts.
 *
 * Financial invariants:
 * - All arithmetic via Decimal (never float).
 * - Server is the Source of Truth: the final total must be re-verified by
 *   the backend at booking time; this engine is for display + pre-checkout.
 * - Rounding: each component rounds HALF_UP to its currency's precision;
 *   the total is the sum of rounded components (no penny drift).
 */

export interface FareBreakdown {
  /** Base fare or room rate before taxes/fees. */
  base: Money;
  /** Government/airport taxes. */
  tax: Money;
  /** Service fee charged by the platform. */
  serviceFee: Money;
  /** Grand total = base + tax + serviceFee (same currency). */
  total: Money;
}

/** Percentages as strings to avoid float literals (e.g. '9' for 9%). */
export interface PricingRules {
  taxPercent: string;
  serviceFeePercent: string;
  /** Per-passenger markup applied before percentages, in base currency. */
  markupPerPax?: string;
}

const DEFAULT_RULES: PricingRules = {
  taxPercent: '9',
  serviceFeePercent: '5',
};

/** Decimal places per currency for display rounding. */
const CURRENCY_PRECISION: Record<CurrencyCode, number> = {
  IRR: 0,
  USD: 2,
  EUR: 2,
  AED: 2,
  CNY: 2,
  RUB: 2,
};

function roundTo(m: Money): Money {
  const dp = CURRENCY_PRECISION[m.currency];
  return {
    amount: m.amount.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP),
    currency: m.currency,
  };
}

/**
 * Prices a booking for `pax` passengers from a per-person base amount.
 * Order of operations (server-mirrored):
 *   1. base_total = (per_pax_base + markup) × pax
 *   2. tax = base_total × taxPercent
 *   3. fee  = base_total × serviceFeePercent
 *   4. total = round(base_total) + round(tax) + round(fee)
 */
export function priceBooking(
  perPaxBase: Money,
  pax: number,
  rules: PricingRules = DEFAULT_RULES,
): FareBreakdown {
  if (pax < 1 || !Number.isInteger(pax)) {
    throw new Error(`Invalid passenger count: ${pax}`);
  }

  const markup = rules.markupPerPax
    ? money(rules.markupPerPax, perPaxBase.currency)
    : zero(perPaxBase.currency);

  const base = roundTo(mul(add(perPaxBase, markup), pax));

  return priceFromBase(base, rules);
}

/**
 * Applies the percentage rules to an already-computed base amount.
 * Shared by flights (per-pax base) and hotels (per-stay base) so the
 * tax/fee order of operations exists in exactly one place.
 */
export function priceFromBase(base: Money, rules: PricingRules = DEFAULT_RULES): FareBreakdown {
  const dp = CURRENCY_PRECISION[base.currency];

  const taxAmount = base.amount
    .times(rules.taxPercent)
    .dividedBy(100)
    .toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
  const feeAmount = base.amount
    .times(rules.serviceFeePercent)
    .dividedBy(100)
    .toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);

  const taxMoney: Money = { amount: taxAmount, currency: base.currency };
  const feeMoney: Money = { amount: feeAmount, currency: base.currency };

  const total = add(add(base, taxMoney), feeMoney);

  return { base, tax: taxMoney, serviceFee: feeMoney, total };
}

/**
 * Prices a hotel stay: nightly rate × nights × rooms, then the standard
 * tax/fee rules. `nights` and `rooms` must be positive integers — the
 * caller is responsible for deriving nights correctly (see domains/hotel).
 */
export function priceStay(
  nightlyRate: Money,
  nights: number,
  rooms: number,
  rules: PricingRules = DEFAULT_RULES,
): FareBreakdown {
  if (!Number.isInteger(nights) || nights < 1) {
    throw new Error(`Invalid night count: ${nights}`);
  }
  if (!Number.isInteger(rooms) || rooms < 1) {
    throw new Error(`Invalid room count: ${rooms}`);
  }
  const base = roundTo(mul(mul(nightlyRate, nights), rooms));
  return priceFromBase(base, rules);
}

/** Converts a breakdown wholesale into another currency at one rate. */
export function convertBreakdown(
  breakdown: FareBreakdown,
  rate: Decimal | string,
  to: CurrencyCode,
): FareBreakdown {
  return {
    base: convert(breakdown.base, rate, to),
    tax: convert(breakdown.tax, rate, to),
    serviceFee: convert(breakdown.serviceFee, rate, to),
    total: convert(breakdown.total, rate, to),
  };
}

function zero(c: CurrencyCode): Money {
  return { amount: new Decimal(0), currency: c };
}

export { CURRENCY_PRECISION };
