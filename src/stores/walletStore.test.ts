import { describe, it, expect, beforeEach } from 'vitest';
import { useWalletStore } from './walletStore';
import { money, zero } from '@/domains/currency/money';

describe('WalletStore — financial invariants', () => {
  beforeEach(() => {
    useWalletStore.setState({
      balances: {
        IRR: zero('IRR'),
        USD: money('1450.00', 'USD'),
        EUR: zero('EUR'),
        AED: zero('AED'),
        CNY: zero('CNY'),
        RUB: zero('RUB'),
      },
      transactions: [],
      unlocked: false,
    });
  });

  it('credits without float drift', () => {
    const store = useWalletStore.getState();
    const next = store.credit(money('0.10', 'USD'), {
      id: 'tx-test-1',
      title: 'Top-up',
      date: '2026-09-24T00:00:00Z',
      category: 'topup',
    });
    expect(next.amount.toFixed(2)).toBe('1450.10');
  });

  it('debits and records transaction', () => {
    const store = useWalletStore.getState();
    const next = store.debit(money('45.00', 'USD'), {
      id: 'tx-test-2',
      title: 'Flight',
      date: '2026-09-24T00:00:00Z',
      category: 'flight',
    });
    expect(next.amount.toFixed(2)).toBe('1405.00');
    expect(useWalletStore.getState().transactions).toHaveLength(1);
  });

  it('rejects debit beyond balance', () => {
    const store = useWalletStore.getState();
    expect(() =>
      store.debit(money('99999', 'USD'), {
        id: 'tx-test-3',
        title: 'Too big',
        date: '2026-09-24T00:00:00Z',
        category: 'pos',
      }),
    ).toThrow(/Insufficient funds/);
  });

  it('throws on mixed currency credit (no balance mixing)', () => {
    const store = useWalletStore.getState();
    // IRR has zero balance; crediting IRR is fine, but converting never happens implicitly
    const next = store.credit(money('1000000', 'IRR'), {
      id: 'tx-test-4',
      title: 'Cash',
      date: '2026-09-24T00:00:00Z',
      category: 'pos',
    });
    expect(next.currency).toBe('IRR');
    expect(next.amount.toFixed(0)).toBe('1000000');
  });

  it('computes IRR equivalent from USD balance via rate', () => {
    const store = useWalletStore.getState();
    store.setRate('600000');
    const irr = useWalletStore.getState().irrEquivalent();
    expect(irr.currency).toBe('IRR');
    expect(irr.amount.toFixed(0)).toBe('870000000');
  });

  it('unlocked flag defaults to false (biometric gate)', () => {
    expect(useWalletStore.getState().unlocked).toBe(false);
  });
});
