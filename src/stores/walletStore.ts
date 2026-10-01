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
import { vault } from '@/services/db/vault';

/**
 * Wallet store — NewCash balances and transaction history.
 *
 * Financial Invariants (Phase 2 — P0 Wallet Integrity):
 * - NO SYNTHETIC BALANCES: Starts uninitialized (null) until first authoritative server sync.
 * - NO FAKE SEED TRANSACTIONS: Transaction ledger populated exclusively from server ledger.
 * - OFFLINE SEMANTICS: Retains the last known server balance with lastSyncedAt timestamp.
 * - Every amount is a Money object backed by Decimal (never raw float).
 * - PENDING ledger entries are intents, not money: they never move balances.
 * - The last authoritative snapshot (balances + recent transactions) is
 *   cached in the encrypted vault so an offline restart still shows the
 *   last server-known state. Ledger data only — never tokens or keys.
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

/** Max transactions kept in the offline wallet cache (FIFO by recency). */
const SNAPSHOT_TX_LIMIT = 200;

interface WalletSnapshot {
  v: 1;
  balances: Record<string, { amount: string; currency: string }> | null;
  transactions: Array<{
    id: string;
    title: string;
    date: string;
    amount: { amount: string; currency: string };
    category: WalletTransaction['category'];
    status?: WalletTransaction['status'];
  }>;
  lastSyncedAt: string | null;
}

/** Serializes the current wallet state to the vault cache (best-effort). */
export async function persistWalletSnapshot(): Promise<void> {
  const { balances, transactions, lastSyncedAt } = useWalletStore.getState();
  const snapshot: WalletSnapshot = {
    v: 1,
    balances: balances
      ? Object.fromEntries(
          Object.entries(balances).map(([code, m]) => [code, { amount: m.amount.toString(), currency: m.currency }]),
        )
      : null,
    transactions: transactions.slice(0, SNAPSHOT_TX_LIMIT).map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      amount: { amount: t.amount.amount.toString(), currency: t.amount.currency },
      category: t.category,
      status: t.status,
    })),
    lastSyncedAt,
  };
  try {
    await vault.saveWalletCache(snapshot);
  } catch {
    // Cache write is best-effort; wallet operations must never block on it.
  }
}

/** A credit only moves the display balance once it is settled. */
function isSettledCredit(status: WalletTransaction['status']): boolean {
  // Legacy callers (and server-synced rows) may omit the status — treated
  // as settled for backwards compatibility. PENDING/FAILED/REFUNDED rows
  // are recorded in the ledger but never credited to the balance here;
  // refunds reach the balance through the authoritative server sync.
  return status === undefined || status === 'SETTLED';
}

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
  /** Restores the last cached wallet snapshot (offline boot); no-op when already initialized. */
  hydrate: () => Promise<void>;
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

  hydrate: async () => {
    // Server truth (or an already-initialized wallet) always wins over the
    // local cache; hydration only fills the offline gap after a restart.
    if (get().balances) return;
    try {
      const raw = await vault.loadWalletCache();
      if (!raw || get().balances) return;
      const snap = raw as WalletSnapshot;
      if (snap?.v !== 1 || !snap.balances) return;
      const balances = {} as Record<CurrencyCode, Money>;
      for (const [code, m] of Object.entries(snap.balances)) {
        balances[code as CurrencyCode] = money(m.amount, m.currency as CurrencyCode);
      }
      set({
        balances,
        transactions: (snap.transactions ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          date: t.date,
          amount: money(t.amount.amount, t.amount.currency as CurrencyCode),
          category: t.category,
          status: t.status,
        })),
        lastSyncedAt: snap.lastSyncedAt ?? null,
      });
    } catch {
      // Hydration is best-effort; the wallet stays uninitialized.
    }
  },

  syncWithServer: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true, syncError: null });
    try {
      await get().hydrate();

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
      void persistWalletSnapshot();
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
    // Ledger invariant: a PENDING entry is an intent, not money — it must
    // never appear in the display balance. Only settled credits move it.
    const movesBalance = isSettledCredit(tx.status);
    const current = balances[amount.currency] ?? zero(amount.currency);
    const next = movesBalance ? add(current, amount) : current;
    set((s) => ({
      balances: s.balances ? { ...s.balances, [amount.currency]: next } : null,
      transactions: [{ ...tx, amount }, ...s.transactions],
    }));
    void persistWalletSnapshot();
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
    void persistWalletSnapshot();
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
