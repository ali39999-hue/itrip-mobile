/**
 * Vault driver abstraction.
 *
 * The vault repository talks to this interface only, so the storage engine
 * can be swapped without touching callers:
 *
 *  - `expo-sqlite`  : default, works in Expo Go and dev builds (plaintext).
 *  - `op-sqlite`    : SQLCipher-encrypted build for production hardening
 *                     (requires a custom native build with SQLCipher enabled).
 *
 * Selection is automatic: the encrypted driver is used when the native
 * module is actually available AND a DB key can be resolved from the
 * Android Keystore; otherwise we degrade to plaintext with a warning.
 */

export interface VaultDriver {
  /** Identifies the active engine for diagnostics/telemetry. */
  readonly engine: 'op-sqlite-encrypted' | 'expo-sqlite';
  readonly encrypted: boolean;
  run(sql: string, params: readonly unknown[]): Promise<void>;
  all<T>(sql: string, params: readonly unknown[]): Promise<T[]>;
  get<T>(sql: string, params: readonly unknown[]): Promise<T | null>;
  exec(sql: string): Promise<void>;
}

let cached: Promise<VaultDriver> | null = null;

export function getVaultDriver(): Promise<VaultDriver> {
  if (!cached) {
    cached = createDriver();
  }
  return cached;
}

/** Test-only: inject a driver (e.g. an in-memory fake). */
export function __setVaultDriverForTests(driver: VaultDriver | null): void {
  cached = driver ? Promise.resolve(driver) : null;
}

async function createDriver(): Promise<VaultDriver> {
  const encrypted = await tryCreateEncryptedDriver();
  if (encrypted) return encrypted;
  await reportPlaintextFallback();
  return createExpoSqliteDriver();
}

let fallbackReported = false;

/**
 * Plaintext degradation must never be silent: traveler vault data would sit
 * unencrypted without anyone knowing. Warn once per session and emit a
 * telemetry event so builds without SQLCipher are visible server-side.
 * No sensitive data is included — only the engine identifier.
 */
async function reportPlaintextFallback(): Promise<void> {
  if (fallbackReported) return;
  fallbackReported = true;
  console.warn('[vault] SQLCipher unavailable — falling back to plaintext expo-sqlite vault engine');
  try {
    const { telemetry } = await import('@/services/telemetry');
    telemetry.record('SYNC_EVENT', 'vault_engine_fallback', {
      engine: 'expo-sqlite',
      encrypted: false,
    });
  } catch {
    // Telemetry is best-effort; the console warning already surfaced it.
  }
}

// ---------------------------------------------------------------------------
// op-sqlite + SQLCipher (production, encryption at rest)
// ---------------------------------------------------------------------------

async function tryCreateEncryptedDriver(): Promise<VaultDriver | null> {
  try {
    // Dynamic import so a missing/unsupported native module never breaks boot.
    const opsqlite = (await import('@op-engineering/op-sqlite')) as unknown as {
      open: (params: { name: string; encryptionKey?: string }) => OpSqliteDb;
      isSQLCipher: () => boolean;
    };

    // Without SQLCipher compiled in, an encryptionKey is silently ignored —
    // that would be a false sense of security, so refuse to use it.
    if (!opsqlite.isSQLCipher()) return null;

    const { getOrCreateDbKey } = await import('@/services/security/dbKey');
    const key = await getOrCreateDbKey();
    const db = opsqlite.open({ name: 'itrip-vault.db', encryptionKey: key });

    await db.execute('PRAGMA journal_mode = WAL;');

    return {
      engine: 'op-sqlite-encrypted',
      encrypted: true,
      async run(sql, params) {
        await db.execute(sql, params as never[]);
      },
      async all<T>(sql: string, params: readonly unknown[]) {
        const res = await db.execute(sql, params as never[]);
        return res.rows as T[];
      },
      async get<T>(sql: string, params: readonly unknown[]) {
        const res = await db.execute(sql, params as never[]);
        return (res.rows[0] as T | undefined) ?? null;
      },
      async exec(sql) {
        await db.execute(sql);
      },
    };
  } catch {
    return null;
  }
}

interface OpSqliteDb {
  execute: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Array<Record<string, unknown>>; rowsAffected: number }>;
}

// ---------------------------------------------------------------------------
// expo-sqlite (default / fallback)
// ---------------------------------------------------------------------------

async function createExpoSqliteDriver(): Promise<VaultDriver> {
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync('itrip-vault.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  return {
    engine: 'expo-sqlite',
    encrypted: false,
    async run(sql, params) {
      await db.runAsync(sql, params as never[]);
    },
    async all<T>(sql: string, params: readonly unknown[]) {
      return db.getAllAsync<T>(sql, params as never[]);
    },
    async get<T>(sql: string, params: readonly unknown[]) {
      return db.getFirstAsync<T>(sql, params as never[]);
    },
    async exec(sql) {
      await db.execAsync(sql);
    },
  };
}
