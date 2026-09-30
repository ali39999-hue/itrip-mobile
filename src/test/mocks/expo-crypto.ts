/**
 * In-memory mock for `expo-crypto` in the Node test environment.
 * Matches the surface used by src/services/security/dbKey.ts.
 */

const usedBytes = new Uint8Array(32).fill(7);

export async function getRandomBytesAsync(length: number): Promise<Uint8Array> {
  return usedBytes.slice(0, length);
}

export default { getRandomBytesAsync };
