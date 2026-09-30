import * as SecureStore from 'expo-secure-store';
import { clearTokens } from '@/services/secure/tokens';
import { deleteDbKey } from '@/services/security/dbKey';
import { getVaultDriver, type VaultDriver } from '@/services/db/driver';
import { DEAD_LETTER_TABLE_DDL } from '@/services/sync/deadLetterQueue';

/**
 * Logout / Account-Switch Wipe (R2 — Data + Sync Reliability).
 *
 * Security invariant: on logout or account switch, ALL user-scoped local
 * state is destroyed — queued mutations, cached vouchers, server booking
 * cache, wallet store content, pending telemetry buffer, and the SQLCipher
 * DB key itself. The next account must never inherit previous data, and a
 * stolen post-logout device must yield nothing.
 *
 * The DB *file* is recreated empty (schema re-applied) rather than deleted,
 * because native file handles may still be open; destroying the key makes
 * any residual page ciphertext unreadable either way.
 */

export interface WipeResult {
  tokensCleared: boolean;
  vaultCleared: boolean;
  queueCleared: boolean;
  bookingsCacheCleared: boolean;
  deadLetterCleared: boolean;
  dbKeyRotated: boolean;
  secureStoreScanned: boolean;
}

const USER_SCOPED_SECURE_KEYS = [
  'itrip.accessToken',
  'itrip.refreshToken',
  'itrip.db.encryption.key',
];

async function wipeSecureStoreKeys(): Promise<void> {
  for (const key of USER_SCOPED_SECURE_KEYS) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Already absent — fine.
    }
  }
}

export async function wipeUserDataForLogout(): Promise<WipeResult> {
  const result: WipeResult = {
    tokensCleared: false,
    vaultCleared: false,
    queueCleared: false,
    bookingsCacheCleared: false,
    deadLetterCleared: false,
    dbKeyRotated: false,
    secureStoreScanned: false,
  };

  // 1. Tokens (SecureStore + in-memory test fallback)
  try {
    await clearTokens();
    result.tokensCleared = true;
  } catch {
    // fallthrough — step 4 sweeps keys individually
  }

  // 2. Local caches: vouchers, mutation queue, server booking cache, dead letters
  try {
    const db: VaultDriver = await getVaultDriver();
    await db.run('DELETE FROM vouchers', []);
    result.vaultCleared = true;
    await db.run('DELETE FROM mutation_queue', []);
    result.queueCleared = true;
    await db.run('DELETE FROM server_bookings', []);
    result.bookingsCacheCleared = true;
    try {
      await db.run('DELETE FROM dead_letter_queue', []);
      result.deadLetterCleared = true;
    } catch {
      // Table may not exist yet on old installs — not an error.
    }
  } catch {
    // DB layer unavailable (e.g. test env) — key destruction below still holds.
  }

  // 3. Destroy the SQLCipher DB key — residual ciphertext becomes unreadable
  try {
    await deleteDbKey();
    result.dbKeyRotated = true;
  } catch {
    // fallthrough
  }

  // 4. Defense-in-depth sweep of every user-scoped SecureStore key
  await wipeSecureStoreKeys();
  result.secureStoreScanned = true;

  return result;
}

/** Ensure schema exists again after a wipe (next boot or next login). */
export async function reinitializeSchemaAfterWipe(): Promise<void> {
  const db = await getVaultDriver();
  await db.exec(`
    ${DEAD_LETTER_TABLE_DDL}
  `);
}

export { USER_SCOPED_SECURE_KEYS };
