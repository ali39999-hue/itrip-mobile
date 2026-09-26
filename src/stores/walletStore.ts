import { create } from 'zustand';
import Decimal from 'decimal.js';
import {
  money,
  add,
  sub,
  convert,
  zero,
  format,
  type Money,
  type CurrencyCode,
} from '@/domains/currency/money';
import { walletService, type ServerTransaction } from '@/services/api';

/**
 * Wallet store — NewCash balances and transaction history.
 *
 * Financial invariants:
 * - Every amount is a Money object backed by Decimal (never raw float).
 * - Balances mutate only through add/sub which enforce same-currency rules.
 * - Server is the Source of Truth; local state is optimistic display cache.
 */

export interface WalletTransaction {
  id: string;
  title: string;
  /** ISO 8601 */
  date: string;
  /** Signed amount: positive = credit, negative = debit */
  amount: Money;
  category: 'flight' | 'hotel' | 'topup' | 'atm' | 'pos' | 'transfer';
  status?: 'PENDING' | 'SETTLED' | 'FAILED' | 'REFUNDED';
}

/** Default spot rate used until the API returns live rates. */
const FALLBACK_USD_IRR_RATE = '600000';

interface WalletState {
  balances: Record<CurrencyCode, Money>;
  /** Rate: 1 USD in IRR. Refreshed from API when online. */
  usdIrrRate: Decimal;
  transactions: WalletTransaction[];
  /** Marks that the wallet is unlocked for viewing (biometric gate passed). */
  unlocked: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  loyaltyPoints: number;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  setUnlocked: (v: boolean) => void;
  /** Syncs balances and transaction ledger with the backend server */
  syncWithServer: () => Promise<void>;
  /** Credits the wallet; returns the new balance. */
  credit: (amount: Money, tx: Omit<WalletTransaction, 'amount'>) => Money;
  /** Debits the wallet; throws on insufficient funds. */
  debit: (amount: Money, tx: Omit<WalletTransaction, 'amount'>) => Money;
  setRate: (rate: string | Decimal) => void;
  /** Equivalent of the USD balance in IRR as a Money object. */
  irrEquivalent: () => Money;
  /** Formatted USD balance string for the given locale. */
  formattedUsd: (locale: string) => string;
}

const initialBalances: Record<CurrencyCode, Money> = {
  IRR: zero('IRR'),
  USD: money('1450.00', 'USD'),
  EUR: zero('EUR'),
  AED: zero('AED'),
  CNY: zero('CNY'),
  RUB: zero('RUB'),
};

const seedTransactions: WalletTransaction[] = [
  {
    id: 'tx-1',
    title: 'Mahan Air · Flight Ticket',
    date: '2026-09-23T14:20:00Z',
    amount: money('-45.00', 'USD'),
    category: 'flight',
    status: 'SETTLED',
  },
  {
    id: 'tx-2',
    title: 'Shiraz Grand Hotel · Deposit',
    date: '2026-10-10T09:00:00Z',
    amount: money('-120.00', 'USD'),
    category: 'hotel',
    status: 'SETTLED',
  },
  {
    id: 'tx-3',
    title: 'NewCash Top-up',
    date: '2026-10-08T11:30:00Z',
    amount: money('500.00', 'USD'),
    category: 'topup',
    status: 'SETTLED',
  },
  {
    id: 'tx-4',
    title: 'ATM Withdrawal · Shetab',
    date: '2026-10-07T18:45:00Z',
    amount: money('-15000000', 'IRR'),
    category: 'atm',
    status: 'SETTLED',
  },
];

export const useWalletStore = create<WalletState>((set, get) => ({
  balances: initialBalances,
  usdIrrRate: new Decimal(FALLBACK_USD_IRR_RATE),
  transactions: seedTransactions,
  unlocked: false,
  isSyncing: false,
  lastSyncedAt: null,
  loyaltyPoints: 120,
  loyaltyTier: 'BRONZE',

  setUnlocked: (v) => set({ unlocked: v }),

  syncWithServer: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      const [serverBalances, serverTxs] = await Promise.all([
        walletService.getBalances(),
        walletService.getTransactions(),
      ]);

      const parsedBalances: Record<CurrencyCode, Money> = {
        USD: money(serverBalances.USD, 'USD'),
        IRR: money(serverBalances.IRR, 'IRR'),
        EUR: money(serverBalances.EUR, 'EUR'),
        AED: money(serverBalances.AED, 'AED'),
        CNY: money(serverBalances.CNY, 'CNY'),
        RUB: money(serverBalances.RUB, 'RUB'),
      };

      const parsedTxs: WalletTransaction[] = serverTxs.length > 0
        ? serverTxs.map((t: ServerTransaction) => ({
            id: t.id,
            title: t.title,
            date: t.date,
            amount: money(t.amount, t.currency),
            category: t.category,
            status: t.status,
          }))
        : get().transactions;

      set({
        balances: parsedBalances,
        usdIrrRate: new Decimal(serverBalances.usdIrrRate || FALLBACK_USD_IRR_RATE),
        transactions: parsedTxs,
        loyaltyPoints: serverBalances.loyaltyPoints ?? 120,
        loyaltyTier: serverBalances.loyaltyTier ?? 'BRONZE',
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
      });
    } catch {
      set({ isSyncing: false });
    }
  },

  credit: (amount, tx) => {
    const current = get().balances[amount.currency] ?? zero(amount.currency);
    const next = add(current, amount);
    set((s) => ({
      balances: { ...s.balances, [amount.currency]: next },
      transactions: [{ ...tx, amount }, ...s.transactions],
    }));
    return next;
  },

  debit: (amount, tx) => {
    const current = get().balances[amount.currency] ?? zero(amount.currency);
    if (current.amount.minus(amount.amount).isNegative()) {
      throw new Error(`Insufficient funds: ${amount.currency}`);
    }
    const next = sub(current, amount);
    set((s) => ({
      balances: { ...s.balances, [amount.currency]: next },
      transactions: [{ ...tx, amount }, ...s.transactions],
    }));
    return next;
  },

  setRate: (rate) => set({ usdIrrRate: new Decimal(rate) }),

  irrEquivalent: () => {
    const { balances, usdIrrRate } = get();
    return convert(balances.USD ?? zero('USD'), usdIrrRate, 'IRR');
  },

  formattedUsd: (locale) => {
    const { balances } = get();
    return format(balances.USD ?? zero('USD'), locale);
  },
}));
