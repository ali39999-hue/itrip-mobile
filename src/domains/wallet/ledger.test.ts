import { describe, it, expect } from 'vitest';
import {
  isSettled,
  isPending,
  settledNet,
  paginateLedger,
  pairReversals,
  type LedgerEntry,
} from './ledger';
import { money } from '@/domains/currency/money';

function entry(overrides: Partial<LedgerEntry> & { id: string }): LedgerEntry {
  return {
    title: `Tx ${overrides.id}`,
    date: '2026-09-28T10:00:00Z',
    amount: money('100.00', 'USD'),
    category: 'topup',
    status: 'SETTLED',
    ...overrides,
  };
}

const ledger: LedgerEntry[] = [
  entry({ id: 'tx-1', date: '2026-09-20T10:00:00Z', amount: money('500.00', 'USD') }),
  entry({ id: 'tx-2', date: '2026-09-25T10:00:00Z', amount: money('-45.00', 'USD'), category: 'flight' }),
  entry({ id: 'tx-3', date: '2026-09-26T10:00:00Z', status: 'PENDING', amount: money('-30.00', 'USD') }),
  entry({ id: 'tx-4', date: '2026-09-27T10:00:00Z', status: 'FAILED', amount: money('-99.00', 'USD') }),
  entry({
    id: 'tx-5',
    date: '2026-09-28T10:00:00Z',
    status: 'REFUNDED',
    amount: money('45.00', 'USD'),
    correctsId: 'tx-2',
  }),
  entry({ id: 'tx-6', date: '2026-09-29T10:00:00Z', amount: money('200.00', 'USD') }),
];

describe('Wallet ledger semantics (R6)', () => {
  it('settled = SETTLED/REFUNDED/REVERSED; PENDING and FAILED are not settled', () => {
    expect(isSettled(ledger[0]!)).toBe(true);
    expect(isSettled(ledger[4]!)).toBe(true);
    expect(isSettled(ledger[2]!)).toBe(false);
    expect(isSettled(ledger[3]!)).toBe(false);
    expect(isPending(ledger[2]!)).toBe(true);
  });

  it('settledNet excludes PENDING and FAILED — money that may still reverse never counts', () => {
    const net = settledNet(ledger, 'USD');
    // 500 - 45 + 45(refund) + 200 = 700 — pending -30 and failed -99 excluded
    expect(net.amount.toFixed(2)).toBe('700.00');
  });

  it('settledNet ignores foreign currencies', () => {
    const mixed: LedgerEntry[] = [
      entry({ id: 'a', amount: money('100.00', 'EUR') }),
      entry({ id: 'b', amount: money('50.00', 'USD') }),
    ];
    expect(settledNet(mixed, 'USD').amount.toFixed(2)).toBe('50.00');
  });

  it('paginates newest-first with a stable id cursor', () => {
    const page1 = paginateLedger(ledger, 3, null);
    expect(page1.entries.map((e) => e.id)).toEqual(['tx-6', 'tx-5', 'tx-4']);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBe('tx-4');

    const page2 = paginateLedger(ledger, 3, page1.nextCursor);
    expect(page2.entries.map((e) => e.id)).toEqual(['tx-3', 'tx-2', 'tx-1']);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();
  });

  it('pagination is stable when a new older row arrives mid-scroll', () => {
    const page1 = paginateLedger(ledger, 3, null);
    const withNewer = [...ledger, entry({ id: 'tx-new', date: '2026-09-30T10:00:00Z' })];
    const page2 = paginateLedger(withNewer, 3, page1.nextCursor!);
    // cursor tx-4 still anchors page 2 — no skip, no duplicate
    expect(page2.entries.map((e) => e.id)).toEqual(['tx-3', 'tx-2', 'tx-1']);
  });

  it('pairs refunds with their originals; unmatched corrections keep their own id', () => {
    const pairs = pairReversals(ledger);
    expect(pairs.get('tx-2')!.id).toBe('tx-5'); // refund of tx-2 keyed by original
    const orphan: LedgerEntry = entry({
      id: 'tx-orphan',
      status: 'REVERSED',
      correctsId: 'tx-missing',
    });
    const pairs2 = pairReversals([orphan]);
    expect(pairs2.get('tx-orphan')!.id).toBe('tx-orphan');
  });
});
