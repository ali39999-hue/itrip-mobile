import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { vault } from '@/services/db/vault';
import { api } from '@/services/api';
import { flightService } from '@/services/api';

/**
 * Background sync — WorkManager-backed periodic vault refresh.
 *
 * Runs even when the app is closed:
 * 1. Pull confirmed bookings for the authenticated traveler.
 * 2. Persist new vouchers to the offline vault.
 * 3. Update cached FX rates used by the SOS converter.
 *
 * The task is intentionally tolerant: any network failure exits early so
 * WorkManager retries with its own backoff (never throws to the scheduler).
 */

export const VAULT_SYNC_TASK = 'itrip-vault-sync';

TaskManager.defineTask(VAULT_SYNC_TASK, async () => {
  try {
    await syncVaultOnce();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    // Returning Failed lets WorkManager apply its retry/backoff policy.
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** One sync pass — exported so it can be triggered manually (tests/debug). */
export async function syncVaultOnce(): Promise<{ fetched: number }> {
  const res = await api.get('/bookings/confirmed');
  const bookings = Array.isArray(res.data?.bookings) ? res.data.bookings : [];

  for (const b of bookings) {
    if (b && typeof b === 'object' && 'kind' in b && 'bookingRef' in b) {
      await vault.saveVoucher(b as Parameters<typeof vault.saveVoucher>[0]);
    }
  }

  // Refresh FX rate so the offline SOS converter stays accurate.
  try {
    const rates = await api.get('/fx/rates');
    const usdIrr: unknown = rates.data?.usdIrr;
    if (typeof usdIrr === 'number' || typeof usdIrr === 'string') {
      const wallet = await import('@/stores/walletStore');
      wallet.useWalletStore.getState().setRate(String(usdIrr));
    }
  } catch {
    // Rate refresh is best-effort.
  }

  return { fetched: bookings.length };
}

/** Registers periodic background sync (idempotent). */
export async function registerBackgroundSync(): Promise<boolean> {
  try {
    const already = await TaskManager.isTaskRegisteredAsync(VAULT_SYNC_TASK);
    if (already) return true;
    await BackgroundTask.registerTaskAsync(VAULT_SYNC_TASK, {
      minimumInterval: 60, // minutes — Android's practical floor
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
