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
   * R2 stale-data policy: removes terminal vouchers older than the TTL.
   * A voucher is terminal when its booking reached CANCELLED/REFUNDED —
   * those have no in-trip value. Completed trips (CONFIRMED/ISSUED in the
   * past) are kept for records until their TTL expires as well.
   * Returns the number of purged rows.
   */
  async purgeExpired(maxAgeMs = 90 * 24 * 60 * 60 * 1000): Promise<number> {
    return withDb(async (db) => {
      const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
      const rows = await db.all<{ booking_ref: string; payload: string }>(
        `SELECT booking_ref, payload FROM vouchers WHERE created_at < ?`,
        [cutoff],
      );
      let purged = 0;
      for (const row of rows) {
        try {
          const voucher = JSON.parse(row.payload) as { status?: string };
          // Only purge terminal/no-longer-relevant vouchers; active or
          // unclassified vouchers are retained (conservative eviction).
          if (voucher.status === 'CANCELLED' || voucher.status === 'REFUNDED') {
            await db.run(`DELETE FROM vouchers WHERE booking_ref = ?`, [row.booking_ref]);
            purged++;
          }
        } catch {
          // Unparseable payload — treat as corrupt, purge defensively.
          await db.run(`DELETE FROM vouchers WHERE booking_ref = ?`, [row.booking_ref]);
          purged++;
        }
      }
      return purged;
    });
  },
};

export type FlightVoucherRow = FlightVoucher;
export type HotelVoucherRow = HotelVoucher;
