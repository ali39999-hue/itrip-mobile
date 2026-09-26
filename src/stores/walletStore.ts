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
 * Financial Invariants (Phase 2 — P0 Wallet Integrity):
 * - NO SYNTHETIC BALANCES: Starts uninitialized (null) until first authoritative server sync.
 * - NO FAKE SEED TRANSACTIONS: Transaction ledger populated exclusively from server ledger.
 * - OFFLINE SEMANTICS: Retains the last known server balance with lastSyncedAt timestamp.
 * - Every amount is a Money object backed by Decimal (never raw float).
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

const FALLBACK_USD_IRR_RATE = '600000';

interface WalletState {
  balances: Record<CurrencyCode, Money> | null;
  /** Rate: 1 USD in IRR. Refreshed from API when online. */
  usdIrrRate: Decimal;
  transactions: WalletTransaction[];
  /** Marks that the wallet is unlocked for viewing (biometric/PIN gate passed). */
  unlocked: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
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
  /** Equivalent of the USD balance in IRR as a Money object (null if uninitialized). */
  irrEquivalent: () => Money | null;
  /** Formatted USD balance string for the given locale. */
  formattedUsd: (locale: string) => string;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balances: null,
  usdIrrRate: new Decimal(FALLBACK_USD_IRR_RATE),
  transactions: [],
  unlocked: false,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  loyaltyPoints: 0,
  loyaltyTier: 'BRONZE',

  setUnlocked: (v) => set({ unlocked: v }),

  syncWithServer: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true, syncError: null });
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

      const parsedTxs: WalletTransaction[] = serverTxs.map((t: ServerTransaction) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        amount: money(t.amount, t.currency),
        category: t.category,
        status: t.status,
      }));

      set({
        balances: parsedBalances,
        usdIrrRate: new Decimal(serverBalances.usdIrrRate || FALLBACK_USD_IRR_RATE),
        transactions: parsedTxs,
        loyaltyPoints: serverBalances.loyaltyPoints ?? 0,
        loyaltyTier: serverBalances.loyaltyTier ?? 'BRONZE',
        lastSyncedAt: serverBalances.lastSyncedAt || new Date().toISOString(),
        isSyncing: false,
        syncError: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Server synchronization failed';
      set({ isSyncing: false, syncError: message });
    }
  },

  credit: (amount, tx) => {
    const { balances } = get();
    if (!balances) {
      throw new Error('Wallet not initialized from server ledger');
    }
    const current = balances[amount.currency] ?? zero(amount.currency);
    const next = add(current, amount);
    set((s) => ({
      balances: s.balances ? { ...s.balances, [amount.currency]: next } : null,
      transactions: [{ ...tx, amount }, ...s.transactions],
    }));
    return next;
  },

  debit: (amount, tx) => {
    const { balances } = get();
    if (!balances) {
      throw new Error('Wallet not initialized from server ledger');
    }
    const current = balances[amount.currency] ?? zero(amount.currency);
    if (current.amount.minus(amount.amount).isNegative()) {
      throw new Error(`Insufficient funds: ${amount.currency}`);
    }
    const next = sub(current, amount);
    set((s) => ({
      balances: s.balances ? { ...s.balances, [amount.currency]: next } : null,
      transactions: [{ ...tx, amount }, ...s.transactions],
    }));
    return next;
  },

  setRate: (rate) => set({ usdIrrRate: new Decimal(rate) }),

  irrEquivalent: () => {
    const { balances, usdIrrRate } = get();
    if (!balances || !balances.USD) return null;
    return convert(balances.USD, usdIrrRate, 'IRR');
  },

  formattedUsd: (locale) => {
    const { balances } = get();
    if (!balances || !balances.USD) return '$0.00';
    return format(balances.USD, locale);
  },
}));
