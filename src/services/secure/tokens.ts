/**
 * Token storage — exclusively SecureStore (backed by Android Keystore).
 * Never logged, never in AsyncStorage.
 *
 * In headless / test / Node environments without native Keystore bindings,
 * gracefully degrades to an in-memory store so unit tests run cleanly.
 */

const ACCESS_KEY = 'itrip.accessToken';
const REFRESH_KEY = 'itrip.refreshToken';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

// In-memory fallback for test runners / environments without native modules
const memoryStore = new Map<string, string>();

async function getSecureStore() {
  try {
    return await import('expo-secure-store');
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  const store = await getSecureStore();
  if (store && typeof store.setItemAsync === 'function') {
    await Promise.all([
      store.setItemAsync(ACCESS_KEY, tokens.accessToken),
      store.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    ]);
  } else {
    memoryStore.set(ACCESS_KEY, tokens.accessToken);
    memoryStore.set(REFRESH_KEY, tokens.refreshToken);
  }
}

export async function getAccessToken(): Promise<string | null> {
  const store = await getSecureStore();
  if (store && typeof store.getItemAsync === 'function') {
    try {
      return await store.getItemAsync(ACCESS_KEY);
    } catch {
      return memoryStore.get(ACCESS_KEY) ?? null;
    }
  }
  return memoryStore.get(ACCESS_KEY) ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await getSecureStore();
  if (store && typeof store.getItemAsync === 'function') {
    try {
      return await store.getItemAsync(REFRESH_KEY);
    } catch {
      return memoryStore.get(REFRESH_KEY) ?? null;
    }
  }
  return memoryStore.get(REFRESH_KEY) ?? null;
}

export async function clearTokens(): Promise<void> {
  memoryStore.clear();
  const store = await getSecureStore();
  if (store && typeof store.deleteItemAsync === 'function') {
    try {
      await Promise.all([
        store.deleteItemAsync(ACCESS_KEY),
        store.deleteItemAsync(REFRESH_KEY),
      ]);
    } catch {
      // Ignored if already absent
    }
  }
}
