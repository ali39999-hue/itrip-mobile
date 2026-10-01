import type { Voucher, FlightVoucher, HotelVoucher } from '@/domains/voucher/voucher';
import { getVaultDriver, type VaultDriver } from './driver';

/**
 * Offline Vault — local storage for confirmed booking vouchers.
 *
 * - The storage engine is chosen by ./driver: SQLCipher-encrypted op-sqlite
 *   in hardened production builds, plaintext expo-sqlite otherwise.
 * - Vouchers are written the moment a booking turns CONFIRMED and are
 *   readable with zero network access (airplane-mode guarantee).
 * - JSON payload per row keeps the schema forward-compatible; the kind
 *   column lets us filter flight vs hotel cheaply.
 * - The wallet_cache table holds the last known wallet snapshot (balances +
 *   recent transactions) so an offline restart still shows the last
 *   authoritative ledger state.
 */

async function withDb<T>(fn: (db: VaultDriver) => Promise<T>): Promise<T> {
  const db = await getVaultDriver();
  await migrate(db);
  return fn(db);
}

let migrated = false;

async function migrate(db: VaultDriver): Promise<void> {
  if (migrated) return;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vouchers (
      booking_ref TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vouchers_kind ON vouchers(kind);
    CREATE INDEX IF NOT EXISTS idx_vouchers_created ON vouchers(created_at DESC);

    CREATE TABLE IF NOT EXISTS mutation_queue (
      id TEXT PRIMARY KEY NOT NULL,
      timestamp INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT NOT NULL UNIQUE,
      mutation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      failure_reason TEXT,
      last_attempt_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_mutation_status ON mutation_queue(status);

    CREATE TABLE IF NOT EXISTS server_bookings (
      id TEXT PRIMARY KEY NOT NULL,
      reference TEXT NOT NULL,
      type TEXT NOT NULL,
      item_title TEXT NOT NULL,
      travel_date TEXT NOT NULL,
      status TEXT NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_server_bookings_status ON server_bookings(status);

    CREATE TABLE IF NOT EXISTS dead_letter_queue (
      id TEXT PRIMARY KEY NOT NULL,
      original_id TEXT NOT NULL,
      mutation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      failure_reason TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      first_failed_at INTEGER NOT NULL,
      last_attempt_at INTEGER,
      resolved_at INTEGER,
      resolution TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
    );
    CREATE INDEX IF NOT EXISTS idx_dlq_resolution ON dead_letter_queue(resolution);

    CREATE TABLE IF NOT EXISTS wallet_cache (
      key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL
    );
  `);
  migrated = true;
}

/** Diagnostics: which engine is protecting the vault right now. */
export async function vaultEngine(): Promise<{
  engine: VaultDriver['engine'];
  encrypted: boolean;
}> {
  const db = await getVaultDriver();
  return { engine: db.engine, encrypted: db.encrypted };
}

const WALLET_CACHE_KEY = 'wallet_snapshot_v1';

const DAY_MS = 24 * 60 * 60 * 1000;

export const vault = {
  async saveVoucher(v: Voucher): Promise<void> {
    await withDb((db) =>
      db.run(
        `INSERT OR REPLACE INTO vouchers (booking_ref, kind, created_at, payload) VALUES (?, ?, ?, ?)`,
        [v.bookingRef, v.kind, v.createdAt, JSON.stringify(v)],
      ),
    );
  },

  async getVoucher(bookingRef: string): Promise<Voucher | null> {
    const row = await withDb((db) =>
      db.get<{ payload: string }>(`SELECT payload FROM vouchers WHERE booking_ref = ?`, [
        bookingRef,
      ]),
    );
    return row ? (JSON.parse(row.payload) as Voucher) : null;
  },

  async listVouchers(): Promise<Voucher[]> {
    const rows = await withDb((db) =>
      db.all<{ payload: string }>(`SELECT payload FROM vouchers ORDER BY created_at DESC`, []),
    );
    return rows.map((r) => JSON.parse(r.payload) as Voucher);
  },

  async listByKind(kind: Voucher['kind']): Promise<Voucher[]> {
    const rows = await withDb((db) =>
      db.all<{ payload: string }>(
        `SELECT payload FROM vouchers WHERE kind = ? ORDER BY created_at DESC`,
        [kind],
      ),
    );
    return rows.map((r) => JSON.parse(r.payload) as Voucher);
  },

  async deleteVoucher(bookingRef: string): Promise<void> {
    await withDb((db) => db.run(`DELETE FROM vouchers WHERE booking_ref = ?`, [bookingRef]));
  },

  async clear(): Promise<void> {
    await withDb((db) => db.run(`DELETE FROM vouchers`, []));
  },

  /**
   * Persists the last known wallet snapshot (balances + recent transactions)
   * so an offline restart can hydrate the wallet from local state. The
   * payload must never contain tokens or credentials — ledger data only.
   */
  async saveWalletCache(snapshot: unknown): Promise<void> {
    await withDb((db) =>
      db.run(`INSERT OR REPLACE INTO wallet_cache (key, payload) VALUES (?, ?)`, [
        WALLET_CACHE_KEY,
        JSON.stringify(snapshot),
      ]),
    );
  },

  /** Returns the cached wallet snapshot, or null when absent/corrupt. */
  async loadWalletCache(): Promise<unknown | null> {
    const row = await withDb((db) =>
      db.get<{ payload: string }>(`SELECT payload FROM wallet_cache WHERE key = ?`, [
        WALLET_CACHE_KEY,
      ]),
    );
    if (!row) return null;
    try {
      return JSON.parse(row.payload) as unknown;
    } catch {
      return null;
    }
  },

  /**
   * Post-trip housekeeping: removes vouchers whose trip has been over for
   * longer than the retention grace, plus corrupt payloads.
   *
   * A voucher is expired when its service end (flight arrival, hotel
   * check-out, tour end, transfer pickup) is older than `graceMs` — during
   * the grace window the voucher stays available for expense claims and
   * refund disputes. Vouchers without a parseable schedule fall back to a
   * `maxAgeMs` TTL measured on `createdAt`.
   * Bounded: at most `limit` rows are examined per call.
   * Returns the number of purged rows.
   */
  async purgeExpired(
    maxAgeMs = 90 * 24 * 60 * 60 * 1000,
    graceMs = 30 * 24 * 60 * 60 * 1000,
    limit = 500,
  ): Promise<number> {
    return withDb(async (db) => {
      const now = Date.now();
      const rows = await db.all<{ booking_ref: string; payload: string }>(
        `SELECT booking_ref, payload FROM vouchers ORDER BY created_at ASC LIMIT ?`,
        [limit],
      );
      let purged = 0;
      for (const row of rows) {
        let voucher: Partial<Voucher>;
        try {
          voucher = JSON.parse(row.payload) as Partial<Voucher>;
        } catch {
          // Unparseable payload — treat as corrupt, purge defensively.
          await db.run(`DELETE FROM vouchers WHERE booking_ref = ?`, [row.booking_ref]);
          purged++;
          continue;
        }
        if (isVoucherExpired(voucher, now, maxAgeMs, graceMs)) {
          await db.run(`DELETE FROM vouchers WHERE booking_ref = ?`, [row.booking_ref]);
          purged++;
        }
      }
      return purged;
    });
  },
};

/** Epoch ms of a date-ish field, or null when missing/unparseable. */
function epochOrNull(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * When the service the voucher covers is over (flight arrival, hotel
 * check-out, tour end, transfer pickup). Returns null when the voucher kind
 * or schedule fields are missing/unparseable.
 */
function voucherServiceEndTime(v: Partial<Voucher>): number | null {
  switch (v?.kind) {
    case 'flight':
      return epochOrNull(v.arrivalTime);
    case 'hotel':
      return epochOrNull(v.checkOut);
    case 'tour': {
      const start = epochOrNull(v.departureDate);
      if (start === null) return null;
      const days =
        typeof v.durationDays === 'number' && Number.isFinite(v.durationDays)
          ? Math.max(0, v.durationDays)
          : 0;
      return start + days * DAY_MS;
    }
    case 'transfer':
      return epochOrNull(v.pickupDateTime);
    default:
      return null;
  }
}

/**
 * Conservative eviction policy: only purge vouchers whose trip clearly is
 * over (past service end + grace) or that carry no schedule and aged past
 * the createdAt TTL. Anything unclassified is retained.
 */
function isVoucherExpired(v: Partial<Voucher>, now: number, maxAgeMs: number, graceMs: number): boolean {
  const serviceEnd = voucherServiceEndTime(v);
  if (serviceEnd !== null) return now > serviceEnd + graceMs;
  const createdAt = epochOrNull(v.createdAt);
  return createdAt !== null && now - createdAt > maxAgeMs;
}

export type FlightVoucherRow = FlightVoucher;
export type HotelVoucherRow = HotelVoucher;
