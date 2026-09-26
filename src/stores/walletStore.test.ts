import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWalletStore } from './walletStore';
import { money, zero } from '@/domains/currency/money';
import { walletService } from '@/services/api';

describe('WalletStore — Phase 2 P0 Financial & Ledger Invariants', () => {
  beforeEach(() => {
    useWalletStore.setState({
      balances: null,
      transactions: [],
      unlocked: false,
      lastSyncedAt: null,
      syncError: null,
      isSyncing: false,
    });
  });

  it('starts uninitialized (balances null) — no synthetic balance created', () => {
    expect(useWalletStore.getState().balances).toBeNull();
    expect(useWalletStore.getState().irrEquivalent()).toBeNull();
    expect(useWalletStore.getState().transactions).toHaveLength(0);
  });

  it('rejects mutations when wallet is uninitialized', () => {
    const store = useWalletStore.getState();
    expect(() =>
      store.credit(money('100.00', 'USD'), {
        id: 'tx-uninit',
        title: 'Top-up',
        date: '2026-09-26T00:00:00Z',
        category: 'topup',
      }),
    ).toThrow(/Wallet not initialized/);

    expect(() =>
      store.debit(money('50.00', 'USD'), {
        id: 'tx-uninit-debit',
        title: 'Payment',
        date: '2026-09-26T00:00:00Z',
        category: 'flight',
      }),
    ).toThrow(/Wallet not initialized/);
  });

  it('populates authoritative balance upon successful server sync', async () => {
    vi.spyOn(walletService, 'getBalances').mockResolvedValueOnce({
      USD: '500.00',
      IRR: '300000000',
      EUR: '0.00',
      AED: '0.00',
      CNY: '0.00',
      RUB: '0.00',
      usdIrrRate: '600000',
      loyaltyPoints: 150,
      loyaltyTier: 'SILVER',
      lastSyncedAt: '2026-09-26T14:00:00Z',
    });

    vi.spyOn(walletService, 'getTransactions').mockResolvedValueOnce([
      {
        id: 'tx-srv-1',
        title: 'Tehran Hotel Reservation',
        date: '2026-09-26T12:00:00Z',
        amount: '-75.00',
        currency: 'USD',
        category: 'hotel',
        status: 'SETTLED',
      },
    ]);

    await useWalletStore.getState().syncWithServer();

    const state = useWalletStore.getState();
    expect(state.balances?.USD.amount.toFixed(2)).toBe('500.00');
    expect(state.balances?.IRR.amount.toFixed(0)).toBe('300000000');
    expect(state.loyaltyTier).toBe('SILVER');
    expect(state.loyaltyPoints).toBe(150);
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0]?.title).toBe('Tehran Hotel Reservation');
    expect(state.lastSyncedAt).toBe('2026-09-26T14:00:00Z');
  });

  it('credits without float drift once initialized', () => {
    useWalletStore.setState({
      balances: {
        IRR: zero('IRR'),
        USD: money('500.00', 'USD'),
        EUR: zero('EUR'),
        AED: zero('AED'),
        CNY: zero('CNY'),
        RUB: zero('RUB'),
      },
    });

    const store = useWalletStore.getState();
    const next = store.credit(money('0.10', 'USD'), {
      id: 'tx-test-1',
      title: 'Top-up',
      date: '2026-09-26T00:00:00Z',
      category: 'topup',
    });
    expect(next.amount.toFixed(2)).toBe('500.10');
  });

  it('debits and rejects debit beyond balance', () => {
    useWalletStore.setState({
      balances: {
        IRR: zero('IRR'),
        USD: money('100.00', 'USD'),
        EUR: zero('EUR'),
        AED: zero('AED'),
        CNY: zero('CNY'),
        RUB: zero('RUB'),
      },
    });

    const store = useWalletStore.getState();
    const next = store.debit(money('45.00', 'USD'), {
      id: 'tx-test-2',
      title: 'Flight',
      date: '2026-09-26T00:00:00Z',
      category: 'flight',
    });
    expect(next.amount.toFixed(2)).toBe('55.00');

    expect(() =>
      store.debit(money('99999', 'USD'), {
        id: 'tx-test-3',
        title: 'Too big',
        date: '2026-09-26T00:00:00Z',
        category: 'pos',
      }),
    ).toThrow(/Insufficient funds/);
  });

  it('retains last known balance and sets syncError when server sync fails offline', async () => {
    const priorTimestamp = '2026-09-26T10:00:00Z';
    useWalletStore.setState({
      balances: {
        IRR: zero('IRR'),
        USD: money('250.00', 'USD'),
        EUR: zero('EUR'),
        AED: zero('AED'),
        CNY: zero('CNY'),
        RUB: zero('RUB'),
      },
      lastSyncedAt: priorTimestamp,
    });

    vi.spyOn(walletService, 'getBalances').mockRejectedValueOnce(new Error('Network unreachable'));

    await useWalletStore.getState().syncWithServer();

    const state = useWalletStore.getState();
    expect(state.balances?.USD.amount.toFixed(2)).toBe('250.00'); // Retained
    expect(state.lastSyncedAt).toBe(priorTimestamp); // Preserved
    expect(state.syncError).toMatch(/Network unreachable/);
  });
});
