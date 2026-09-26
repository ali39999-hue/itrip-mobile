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
};

export type FlightVoucherRow = FlightVoucher;
export type HotelVoucherRow = HotelVoucher;
