import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * Database encryption key for SQLCipher.
 *
 * Key generation strategy:
 * 1. Generate a 256-bit random key on first launch
 * 2. Store in Android Keystore via expo-secure-store
 * 3. Never log, never persist in plain text
 */

const DB_KEY_ID = 'itrip.db.encryption.key';

export async function getOrCreateDbKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DB_KEY_ID);
  if (existing) return existing;

  // 32 bytes (256-bit) random → hex string (SQLCipher key)
  const bytes = await Crypto.getRandomBytesAsync(32);
  if (!bytes || bytes.length !== 32) {
    throw new Error('Secure RNG unavailable — cannot create DB key');
  }
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DB_KEY_ID, key);
  return key;
}

export async function deleteDbKey(): Promise<void> {
  await SecureStore.deleteItemAsync(DB_KEY_ID);
}
