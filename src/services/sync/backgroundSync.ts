import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { vault } from '@/services/db/vault';
import { bookingService, walletService, flightService } from '@/services/api';
import { mutationQueue } from '@/services/sync/mutationQueue';
import { BookingStatus } from '@/domains/booking/state';
import { parseVoucher } from '@/domains/voucher/schema';
import { telemetry } from '@/services/telemetry';

/**
 * Production Sync Engine (Phase 6 — Sync Engine).
 *
 * Implements:
 * 1. Offline mutation queue draining (FIFO with exponential backoff).
 * 2. Authoritative booking voucher synchronization.
 * 3. Double-entry ledger wallet balance & transaction refresh.
 * 4. SOS live FX rate cache refresh.
 *
 * Triggers:
 * - Boot (initial sync)
 * - AppState foreground transition
 * - NetInfo connectivity restoration
 * - Periodic background task (WorkManager)
 * - User pull-to-refresh
 */

export const VAULT_SYNC_TASK = 'itrip-vault-sync';

export interface SyncResult {
  vouchersFetched: number;
  /** Server payloads rejected by the voucher schema (local row kept intact). */
  vouchersSkipped: number;
  mutationsProcessed: number;
  mutationsSucceeded: number;
  balancesUpdated: boolean;
  timestamp: string;
}

TaskManager.defineTask(VAULT_SYNC_TASK, async () => {
  try {
    await syncAll();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    // Returning Failed lets WorkManager apply its retry/backoff policy.
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

let isSyncInProgress = false;

/**
 * Executes a full synchronization cycle across mutations, vouchers, and balances.
 * Safe against concurrent invocations (single-flight execution).
 */
export async function syncAll(): Promise<SyncResult> {
  if (isSyncInProgress) {
    return {
      vouchersFetched: 0,
      vouchersSkipped: 0,
      mutationsProcessed: 0,
      mutationsSucceeded: 0,
      balancesUpdated: false,
      timestamp: new Date().toISOString(),
    };
  }

  isSyncInProgress = true;
  const result: SyncResult = {
    vouchersFetched: 0,
    vouchersSkipped: 0,
    mutationsProcessed: 0,
    mutationsSucceeded: 0,
    balancesUpdated: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Drain pending offline mutation queue first
    const mutResult = await mutationQueue.processQueue();
    result.mutationsProcessed = mutResult.processed;
    result.mutationsSucceeded = mutResult.succeeded;

    // 2. Sync server bookings & vouchers
    try {
      const bookings = await bookingService.listUserBookings();
      for (const b of bookings) {
        // FSM guard: only CONFIRMED bookings carry an in-trip voucher.
        // PAYMENT_CONFIRMED can still transition to CANCELLED, and
        // CANCELLED/EXPIRED bookings have no in-trip value — their payloads
        // must never overwrite a good local voucher.
        if (b.status === BookingStatus.CONFIRMED && b.voucher) {
          // Schema gate: an incomplete server payload would produce a vault
          // row that breaks the whole voucher load on boot. Skip it and keep
          // the local voucher intact.
          const parsed = parseVoucher(b.voucher);
          if (!parsed) {
            result.vouchersSkipped++;
            telemetry.record('SYNC_EVENT', 'vault_voucher_skipped', {
              bookingRef: b.reference,
              serverStatus: b.status,
            });
            continue;
          }
          await vault.saveVoucher(parsed);
          result.vouchersFetched++;
        } else if (
          b.status === BookingStatus.CANCELLED ||
          b.status === BookingStatus.EXPIRED ||
          b.status === BookingStatus.REFUNDED
        ) {
          // Terminal booking — evict any stale local voucher for it.
          await vault.deleteVoucher(b.reference);
        }
      }
      // Bounded post-sync housekeeping: evict vouchers whose trip ended
      // beyond the retention grace (fire-and-forget, never blocks the sync).
      void vault.purgeExpired().catch(() => {});
    } catch {
      // Bookings sync is best-effort if network flakes
    }

    // 3. Refresh wallet balances and transaction history
    try {
      const wallet = await import('@/stores/walletStore');
      await wallet.useWalletStore.getState().syncWithServer();
      result.balancesUpdated = true;
    } catch {
      // Wallet sync is best-effort
    }

    // 4. Refresh FX rates for the offline SOS converter
    try {
      const fx = await walletService.getFxRates();
      if (fx.USD_IRR) {
        const wallet = await import('@/stores/walletStore');
        wallet.useWalletStore.getState().setRate(fx.USD_IRR);
      }
    } catch {
      // FX refresh is best-effort
    }

    return result;
  } finally {
    isSyncInProgress = false;
  }
}

/** Legacy alias for backwards compatibility */
export async function syncVaultOnce(): Promise<{ fetched: number }> {
  const res = await syncAll();
  return { fetched: res.vouchersFetched };
}

/** Registers periodic background sync (idempotent). */
export async function registerBackgroundSync(): Promise<boolean> {
  try {
    const already = await TaskManager.isTaskRegisteredAsync(VAULT_SYNC_TASK);
    if (already) return true;
    await BackgroundTask.registerTaskAsync(VAULT_SYNC_TASK, {
      minimumInterval: 60, // minutes — Android WorkManager minimum interval
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const already = await TaskManager.isTaskRegisteredAsync(VAULT_SYNC_TASK);
    if (already) await BackgroundTask.unregisterTaskAsync(VAULT_SYNC_TASK);
  } catch {
    // Nothing to do.
  }
}

export { flightService };
