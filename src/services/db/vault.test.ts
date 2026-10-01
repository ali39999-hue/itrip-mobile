import { describe, it, expect, beforeEach } from 'vitest';
import { vault } from './vault';
import { __setVaultDriverForTests, type VaultDriver } from './driver';
import type { HotelVoucher, FlightVoucher, TourVoucher, TransferVoucher } from '@/domains/voucher/voucher';
import { parseVoucher } from '@/domains/voucher/schema';

/** In-memory driver capturing rows for eviction & cache tests. */
class InMemoryVaultDriver implements VaultDriver {
  readonly engine = 'expo-sqlite' as const;
  readonly encrypted = false;
  vouchers = new Map<string, { created_at: string; payload: string }>();
  walletCache = new Map<string, string>();

  async run(sql: string, params: readonly unknown[]): Promise<void> {
    if (sql.startsWith('INSERT OR REPLACE INTO vouchers')) {
      const [bookingRef, , createdAt, payload] = params;
      this.vouchers.set(String(bookingRef), {
        created_at: String(createdAt),
        payload: String(payload),
      });
    } else if (sql.startsWith('INSERT OR REPLACE INTO wallet_cache')) {
      this.walletCache.set(String(params[0]), String(params[1]));
    } else if (sql.startsWith('DELETE FROM vouchers WHERE booking_ref')) {
      this.vouchers.delete(String(params[0]));
    } else if (sql.startsWith('DELETE FROM vouchers')) {
      this.vouchers.clear();
    }
  }

  async all<T>(sql: string, params: readonly unknown[]): Promise<T[]> {
    if (sql.includes('SELECT booking_ref, payload FROM vouchers ORDER BY created_at ASC LIMIT ?')) {
      const limit = Number(params[0]);
      return Array.from(this.vouchers.entries())
        .sort((a, b) => a[1].created_at.localeCompare(b[1].created_at))
        .slice(0, limit)
        .map(([ref, v]) => ({ booking_ref: ref, payload: v.payload })) as T[];
    }
    return [];
  }

  async get<T>(sql: string, params: readonly unknown[]): Promise<T | null> {
    if (sql.includes('SELECT payload FROM vouchers WHERE booking_ref = ?')) {
      const row = this.vouchers.get(String(params[0]));
      return row ? ({ payload: row.payload } as T) : null;
    }
    if (sql.includes('SELECT payload FROM wallet_cache WHERE key = ?')) {
      const payload = this.walletCache.get(String(params[0]));
      return payload ? ({ payload } as T) : null;
    }
    return null;
  }

  async exec(): Promise<void> {}
}

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString();
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * DAY).toISOString();
}

function makeHotelVoucher(ref: string, createdAt: string, checkOut: string): HotelVoucher {
  return {
    kind: 'hotel',
    bookingRef: ref,
    createdAt,
    hotelName: 'Test Hotel',
    hotelNameFa: 'هتل تست',
    addressFa: 'آدرس تست',
    phone: '021',
    checkIn: checkOut,
    checkOut,
    nights: 1,
    roomType: 'Standard',
    guests: 1,
    total: { amount: '100', currency: 'USD' },
  };
}

function makeFlightVoucher(ref: string, createdAt: string, arrivalTime: string): FlightVoucher {
  return {
    kind: 'flight',
    bookingRef: ref,
    createdAt,
    airline: 'X',
    airlineCode: 'XX',
    flightNumber: '100',
    origin: 'IKA',
    originCity: 'Tehran',
    destination: 'SYZ',
    destinationCity: 'Shiraz',
    departureTime: arrivalTime,
    arrivalTime,
    durationMinutes: 60,
    cabinClass: 'ECONOMY',
    passengers: [],
    total: { amount: '50', currency: 'USD' },
  };
}

describe('vault stale-data policy (post-trip purgeExpired)', () => {
  let driver: InMemoryVaultDriver;

  beforeEach(() => {
    driver = new InMemoryVaultDriver();
    __setVaultDriverForTests(driver);
  });

  it('purges a voucher whose trip ended beyond the retention grace', async () => {
    const old = daysAgo(120);
    await vault.saveVoucher(makeFlightVoucher('ITR-FL-OLD', old, old));

    const purged = await vault.purgeExpired();
    expect(purged).toBe(1);
    expect(await vault.getVoucher('ITR-FL-OLD')).toBeNull();
  });

  it('retains a voucher still inside the grace window after the trip', async () => {
    // Arrival 10 days ago — inside the default 30-day grace.
    await vault.saveVoucher(makeFlightVoucher('ITR-FL-RECENT', daysAgo(60), daysAgo(10)));

    const purged = await vault.purgeExpired();
    expect(purged).toBe(0);
    expect(await vault.getVoucher('ITR-FL-RECENT')).not.toBeNull();
  });

  it('retains an upcoming trip even when the voucher was created long ago', async () => {
    // Booked 120 days ago for a stay that has not happened yet — the
    // createdAt TTL must NOT evict vouchers with a valid future schedule.
    await vault.saveVoucher(makeHotelVoucher('ITR-H-FUTURE', daysAgo(120), daysFromNow(30)));

    const purged = await vault.purgeExpired();
    expect(purged).toBe(0);
    expect(await vault.getVoucher('ITR-H-FUTURE')).not.toBeNull();
  });

  it('purges schedule-less vouchers past the createdAt TTL fallback', async () => {
    const old = daysAgo(120);
    const tour: TourVoucher = {
      kind: 'tour',
      bookingRef: 'ITR-T-NOSCHEDULE',
      createdAt: old,
      tourTitle: 'Old Tour',
      tourTitleFa: 'تور قدیمی',
      city: 'Isfahan',
      departureDate: old,
      durationDays: 1,
      executionModel: 'group',
      hotelTier: 'STD',
      travelers: 1,
      leadPassengerName: 'A B',
      total: { amount: '1', currency: 'IRR' },
    };
    await vault.saveVoucher(tour);
    // Break the schedule so no service end can be derived → TTL fallback.
    driver.vouchers.get('ITR-T-NOSCHEDULE')!.payload = JSON.stringify({
      ...tour,
      departureDate: 'not-a-date',
      durationDays: 'bogus',
    });

    const purged = await vault.purgeExpired();
    expect(purged).toBe(1);
    expect(await vault.getVoucher('ITR-T-NOSCHEDULE')).toBeNull();
  });

  it('purges corrupt payloads defensively', async () => {
    const transfer: TransferVoucher = {
      kind: 'transfer',
      bookingRef: 'ITR-TR-CORRUPT',
      createdAt: daysAgo(120),
      carTitle: 'Car',
      pickupLocation: 'IKA',
      dropoffLocation: 'Hotel',
      pickupDateTime: daysAgo(120),
      withDriver: true,
      passengerName: 'A',
      passengerPhone: '0913',
      total: { amount: '5', currency: 'IRR' },
    };
    await vault.saveVoucher(transfer);
    driver.vouchers.get('ITR-TR-CORRUPT')!.payload = '{corrupt-json!!';

    const purged = await vault.purgeExpired();
    expect(purged).toBe(1);
    expect(await vault.getVoucher('ITR-TR-CORRUPT')).toBeNull();
  });

  it('deletes a local voucher by booking reference (terminal-booking cleanup)', async () => {
    await vault.saveVoucher(makeHotelVoucher('ITR-H-DEL', daysAgo(1), daysFromNow(1)));
    expect(await vault.getVoucher('ITR-H-DEL')).not.toBeNull();

    await vault.deleteVoucher('ITR-H-DEL');
    expect(await vault.getVoucher('ITR-H-DEL')).toBeNull();
  });
});

describe('vault wallet cache', () => {
  let driver: InMemoryVaultDriver;

  beforeEach(() => {
    driver = new InMemoryVaultDriver();
    __setVaultDriverForTests(driver);
  });

  it('round-trips a wallet snapshot', async () => {
    await expect(vault.loadWalletCache()).resolves.toBeNull();

    const snapshot = {
      v: 1,
      balances: { USD: { amount: '500.10', currency: 'USD' } },
      transactions: [{ id: 'tx-1', title: 'Top-up', amount: { amount: '0.10', currency: 'USD' } }],
      lastSyncedAt: '2026-09-26T14:00:00Z',
    };
    await vault.saveWalletCache(snapshot);
    await expect(vault.loadWalletCache()).resolves.toEqual(snapshot);
  });

  it('returns null for a corrupt cached payload', async () => {
    await vault.saveWalletCache({ ok: true });
    const [key] = Array.from(driver.walletCache.keys());
    driver.walletCache.set(key!, '{corrupt!!');
    await expect(vault.loadWalletCache()).resolves.toBeNull();
  });
});

describe('voucher payload schema (vault ingestion gate)', () => {
  it('accepts a complete flight voucher payload', () => {
    const v = makeFlightVoucher('ITR-FL-OK', daysAgo(1), daysFromNow(1));
    expect(parseVoucher(v)).toEqual(v);
  });

  it('rejects payloads missing render-critical fields', () => {
    const v = makeFlightVoucher('ITR-FL-BAD', daysAgo(1), daysFromNow(1));
    expect(parseVoucher({ ...v, airline: undefined })).toBeNull();
    // Missing schedule, and float amounts must all fail:
    expect(parseVoucher({ ...v, departureTime: '' })).toBeNull();
    expect(parseVoucher({ ...v, total: { amount: 50.5, currency: 'USD' } })).toBeNull();
    expect(parseVoucher({ kind: 'flight' })).toBeNull();
    expect(parseVoucher(null)).toBeNull();
  });

  it('rejects unknown voucher kinds', () => {
    const v = makeHotelVoucher('ITR-H-OK', daysAgo(1), daysFromNow(1));
    expect(parseVoucher({ ...v, kind: 'cruise' })).toBeNull();
  });
});
