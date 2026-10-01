import Decimal from 'decimal.js';
import { CURRENCY_PRECISION } from '@/domains/booking/pricing';
import type { CurrencyCode } from './money';

/**
 * Legacy web-payload price normalization — src/domains/currency/rates.ts
 *
 * SERVER IS THE SOURCE OF TRUTH for exchange rates. Authoritative rates are
 * served by the backend financial ledger (`GET /fx/rates` and
 * `WalletBalances.usdIrrRate`). The constants below are a documented fallback
 * ONLY for normalizing legacy Next.js web-platform search payloads that
 * expose prices without a usable currency tag. They must NEVER be used for
 * settlement, charging, refunds, or wallet math.
 *
 * Invariants (AGENTS.md §5.3):
 * - Zero float arithmetic: every operation here is Decimal.
 * - Rounding happens exclusively with CURRENCY_PRECISION[currency] and
 *   Decimal.ROUND_HALF_UP, and amounts cross the wire as decimal strings.
 */

/** IRR units per 1 USD — documented display/normalization fallback rate. */
export const IRR_PER_USD = '600000';

/**
 * Detection floor (in IRR units, ~ $0.17 at the fallback rate) for untagged
 * legacy prices. The legacy web payload mixes two conventions: USD
 * major-unit prices and untagged IRR prices. IRR prices are always integers
 * and no real fare or per-night hotel rate costs less than this floor, while
 * no real USD fare reaches it — the previous 10,000 threshold mis-converted
 * legitimate high-value USD fares (e.g. a $12,000 business fare became
 * $0.02). Values at/above the floor are IRR; anything below stays USD.
 */
export const UNTAGGED_IRR_FLOOR = '100000';

/** Currency codes accepted across the Firuzo offer contracts. */
export const SUPPORTED_CURRENCIES = ['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * True when an untagged legacy price is in the IRR scale: integral (IRR has
 * zero decimal places) and at or above UNTAGGED_IRR_FLOOR.
 */
export function isUntaggedIrrScale(raw: Decimal): boolean {
  return raw.isInteger() && raw.greaterThanOrEqualTo(new Decimal(UNTAGGED_IRR_FLOOR));
}

/** Converts an IRR amount to USD at the documented fallback rate (no rounding). */
export function irrToUsd(raw: Decimal): Decimal {
  return raw.dividedBy(IRR_PER_USD);
}

/**
 * Parses a legacy price without float arithmetic. Accepts finite numbers and
 * decimal strings (thousand-grouping commas tolerated). Returns null when no
 * usable positive price exists — callers must skip the offer rather than
 * fabricate a default price.
 */
export function parseLegacyPrice(raw: unknown): Decimal | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const price = new Decimal(String(raw));
    return price.greaterThan(0) ? price : null;
  }
  if (typeof raw === 'string') {
    const normalized = raw.trim().replace(/,/g, '');
    if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
    const price = new Decimal(normalized);
    return price.greaterThan(0) ? price : null;
  }
  return null;
}

/**
 * Reads an explicit currency tag from a legacy payload record. Returns null
 * when the field is absent or not one of the supported codes.
 */
export function readTaggedCurrency(raw: unknown): SupportedCurrency | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code)
    ? (code as SupportedCurrency)
    : null;
}

export interface NormalizedLegacyPrice {
  /** Rounded amount as a decimal string (never float). */
  amount: string;
  currency: SupportedCurrency;
}

/**
 * Normalizes one legacy web-platform price into the uniform mobile offer
 * contract:
 * - Explicit currency tag (any supported code, including IRR) is used
 *   verbatim — the server is authoritative and no rate is invented.
 * - Untagged IRR-scale prices (integral, >= UNTAGGED_IRR_FLOOR) convert to
 *   USD at the documented fallback rate (destination currency of this
 *   legacy branch).
 * - Untagged smaller prices are already USD per the web payload convention
 *   and pass through unchanged.
 * Returns null when the raw price is unusable. Rounding: ROUND_HALF_UP at
 * CURRENCY_PRECISION of the resulting currency.
 */
export function normalizeLegacyPrice(
  raw: unknown,
  taggedCurrency: SupportedCurrency | null,
): NormalizedLegacyPrice | null {
  const price = parseLegacyPrice(raw);
  if (!price) return null;

  let currency: CurrencyCode;
  let converted = price;

  if (taggedCurrency) {
    currency = taggedCurrency;
  } else if (isUntaggedIrrScale(price)) {
    currency = 'USD';
    converted = irrToUsd(price);
  } else {
    currency = 'USD';
  }

  const dp = CURRENCY_PRECISION[currency] ?? 2;
  return {
    amount: converted.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP).toFixed(dp, Decimal.ROUND_HALF_UP),
    currency,
  };
}
