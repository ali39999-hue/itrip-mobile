import { describe, it, expect, beforeEach } from 'vitest';
import { wipeUserDataForLogout, USER_SCOPED_SECURE_KEYS } from './wipe';
import { saveTokens } from '@/services/secure/tokens';
import * as SecureStore from 'expo-secure-store';

/**
 * R2 wipe invariants. The SecureStore alias in vitest.config points to the
 * in-memory mock, so the secure-key sweep is observable. The DB layer is
 * unavailable in Node — the wipe must still complete every other layer
 * (that is exactly the per-layer best-effort contract).
 */

describe('logout / account-switch wipe (R2)', () => {
  beforeEach(async () => {
    // Seed tokens + a DB key into the mocked SecureStore
    await saveTokens({ accessToken: 'at-1', refreshToken: 'rt-1' });
    await SecureStore.setItemAsync('itrip.db.encryption.key', 'a'.repeat(64));
  });

  it('reports every sweepable layer as completed even without a native DB', async () => {
    const res = await wipeUserDataForLogout();
    expect(res.tokensCleared).toBe(true);
    expect(res.dbKeyRotated).toBe(true);
    expect(res.secureStoreScanned).toBe(true);
  });

  it('destroys tokens so no credential survives logout', async () => {
    await wipeUserDataForLogout();
    expect(await SecureStore.getItemAsync('itrip.accessToken')).toBeNull();
    expect(await SecureStore.getItemAsync('itrip.refreshToken')).toBeNull();
    expect(await SecureStore.getItemAsync('itrip.db.encryption.key')).toBeNull();
  });

  it('sweeps exactly the declared user-scoped key set (no over-deletion)', () => {
    expect(USER_SCOPED_SECURE_KEYS).toEqual([
      'itrip.accessToken',
      'itrip.refreshToken',
      'itrip.db.encryption.key',
    ]);
  });

  it('is idempotent — a second wipe on a clean device succeeds', async () => {
    await wipeUserDataForLogout();
    const second = await wipeUserDataForLogout();
    expect(second.secureStoreScanned).toBe(true);
    expect(await SecureStore.getItemAsync('itrip.accessToken')).toBeNull();
  });
});
