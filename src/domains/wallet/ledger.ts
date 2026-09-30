import { z } from 'zod';
import { money, type Money, type CurrencyCode } from '@/domains/currency/money';

/**
 * Wallet Ledger Domain (R6 — Wallet + Payments + Commerce).
 *
 * Pure client-side ledger semantics layered on the server's
 * double-entry ledger. The server remains authoritative for every
 * amount; this module only classifies, paginates and renders-safe.
 *
 * Invariants:
 * - A PENDING transaction NEVER counts toward the displayed balance
 *   delta summary (it may still reverse).
 * - REFUNDED/REVERSED entries are terminal — they never re-join
 *   "pending" state locally; corrections arrive as new ledger rows.
 */

export const LedgerStatusSchema = z.enum(['PENDING', 'SETTLED', 'FAILED', 'REFUNDED', 'REVERSED']);
export type LedgerStatus = z.infer<typeof LedgerStatusSchema>;

export interface LedgerEntry {
  id: string;
  title: string;
  date: string; // ISO
  amount: Money; // signed
  category: string;
  status: LedgerStatus;
  /** Server ledger id this entry corrects (for REVERSED/REFUNDED). */
  correctsId?: string;
}

export interface LedgerPage {
  entries: LedgerEntry[];
  /** Opaque cursor for the next page; null when exhausted. */
  nextCursor: string | null;
  hasMore: boolean;
}

/** True when the entry's amount is finished posting (affects balance summaries). */
export function isSettled(entry: LedgerEntry): boolean {
  return entry.status === 'SETTLED' || entry.status === 'REFUNDED' || entry.status === 'REVERSED';
}

export function isPending(entry: LedgerEntry): boolean {
  return entry.status === 'PENDING';
}

/**
 * Signed net of a page, SETTLED-class entries only (PENDING excluded —
 * it may still reverse; FAILED never posted). Useful for "this week"
 * summaries without lying about pending money.
 */
export function settledNet(entries: LedgerEntry[], currency: CurrencyCode): Money {
  let net = money(0, currency).amount;
  for (const e of entries) {
    if (!isSettled(e)) continue;
    if (e.amount.currency !== currency) continue;
    net = net.plus(e.amount.amount);
  }
  return { amount: net, currency };
}

/**
 * Deterministic pagination over a full ledger slice (client-side mirror
 * of server cursors). Cursor = "last seen id" — stable across inserts.
 */
export function paginateLedger(
  all: LedgerEntry[],
  pageSize: number,
  cursor: string | null,
): LedgerPage {
  const ordered = [...all].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date),
  );
  const startIndex = cursor ? ordered.findIndex((e) => e.id === cursor) + 1 : 0;
  const slice = ordered.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < ordered.length;
  return {
    entries: slice,
    nextCursor: hasMore ? slice[slice.length - 1]!.id : null,
    hasMore,
  };
}

/**
 * Pairs REFUNDED/REVERSED entries with the originals they correct.
 * Returns a map: correctedId -> correcting entry. Unmatched corrections
 * (original not in slice) are kept under their own id.
 */
export function pairReversals(entries: LedgerEntry[]): Map<string, LedgerEntry> {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const pairs = new Map<string, LedgerEntry>();
  for (const e of entries) {
    if ((e.status === 'REFUNDED' || e.status === 'REVERSED') && e.correctsId) {
      pairs.set(byId.has(e.correctsId) ? e.correctsId : e.id, e);
    }
  }
  return pairs;
}
