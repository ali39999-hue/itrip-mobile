import { describe, it, expect, beforeEach } from 'vitest';
import { vault } from './vault';
import { __setVaultDriverForTests, type VaultDriver } from './driver';
import type { HotelVoucher, FlightVoucher, TourVoucher, TransferVoucher } from '@/domains/voucher/voucher';

/** In-memory driver capturing rows for TTL eviction tests. */
class InMemoryVaultDriver implements VaultDriver {
  readonly engine = 'expo-sqlite' as const;
  readonly encrypted = false;
  vouchers = new Map<string, { created_at: string; payload: string }>();

  async run(sql: string, params: readonly unknown[]): Promise<void> {
    if (sql.startsWith('INSERT OR REPLACE INTO vouchers')) {
      const [bookingRef, , createdAt, payload] = params;
      this.vouchers.set(String(bookingRef), {
        created_at: String(createdAt),
        payload: String(payload),
      });
    } else if (sql.startsWith('DELETE FROM vouchers WHERE booking_ref')) {
      this.vouchers.delete(String(params[0]));
    } else if (sql.startsWith('DELETE FROM vouchers')) {
      this.vouchers.clear();
    }
  }

  async all<T>(sql: string, params: readonly unknown[]): Promise<T[]> {
    if (sql.includes('SELECT booking_ref, payload FROM vouchers WHERE created_at < ?')) {
      const cutoff = String(params[0]);
      return Array.from(this.vouchers.entries())
        .filter(([, v]) => v.created_at < cutoff)
        .map(([ref, v]) => ({ booking_ref: ref, payload: v.payload })) as T[];
    }
    return [];
  }

  async get<T>(sql: string, params: readonly unknown[]): Promise<T | null> {
    if (sql.includes('SELECT payload FROM vouchers WHERE booking_ref = ?')) {
      const row = this.vouchers.get(String(params[0]));
      return row ? ({ payload: row.payload } as T) : null;
    }
    return null;
  }

  async exec(): Promise<void> {}
}

function makeHotelVoucher(ref: string, createdAt: string, status?: string): HotelVoucher {
  const v: HotelVoucher = {
    kind: 'hotel',
    bookingRef: ref,
    createdAt,
    hotelName: 'Test Hotel',
    hotelNameFa: 'هتل تست',
    addressFa: 'آدرس تست',
    phone: '021',
    checkIn: createdAt,
    checkOut: createdAt,
    nights: 1,
    roomType: 'Standard',
    guests: 1,
    total: { amount: '100', currency: 'USD' },
  };
  return status ? { ...v, ...(status ? {} : {}) } : v;
}

describe('vault stale-data policy (R2 purgeExpired)', () => {
  let driver: InMemoryVaultDriver;

  beforeEach(() => {
    driver = new InMemoryVaultDriver();
    __setVaultDriverForTests(driver);
  });

  it('purges cancelled vouchers older than the TTL cutoff', async () => {
    const old = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const cancelled: FlightVoucher = {
      kind: 'flight',
      bookingRef: 'ITR-CXL-OLD',
      createdAt: old,
      airline: 'X',
      airlineCode: 'XX',
      flightNumber: '100',
      origin: 'IKA',
      originCity: 'Tehran',
      destination: 'SYZ',
      destinationCity: 'Shiraz',
      departureTime: old,
      arrivalTime: old,
      durationMinutes: 60,
      cabinClass: 'ECONOMY',
      passengers: [],
      total: { amount: '50', currency: 'USD' },
    };
    // Persist with a status marker inside the payload
    await vault.saveVoucher(cancelled);
    driver.vouchers.get('ITR-CXL-OLD')!.payload = JSON.stringify({ ...cancelled, status: 'CANCELLED' });

    const purged = await vault.purgeExpired(90 * 24 * 60 * 60 * 1000);
    expect(purged).toBe(1);
    expect(await vault.getVoucher('ITR-CXL-OLD')).toBeNull();
  });

  it('retains recent vouchers and unclassified old vouchers (conservative eviction)', async () => {
    const old = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const recentHotel = makeHotelVoucher('ITR-H-NEW', new Date().toISOString());
    await vault.saveVoucher(recentHotel);

    // Old voucher WITHOUT terminal status marker → retained
    const oldTour: TourVoucher = {
      kind: 'tour',
      bookingRef: 'ITR-T-OLD',
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
    await vault.saveVoucher(oldTour);

    const purged = await vault.purgeExpired(90 * 24 * 60 * 60 * 1000);
    expect(purged).toBe(0);
    expect(await vault.getVoucher('ITR-H-NEW')).not.toBeNull();
    expect(await vault.getVoucher('ITR-T-OLD')).not.toBeNull();
  });

  it('purges corrupt payloads defensively', async () => {
    const old = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const transfer: TransferVoucher = {
      kind: 'transfer',
      bookingRef: 'ITR-TR-CORRUPT',
      createdAt: old,
      carTitle: 'Car',
      pickupLocation: 'IKA',
      dropoffLocation: 'Hotel',
      pickupDateTime: old,
      withDriver: true,
      passengerName: 'A',
      passengerPhone: '0913',
      total: { amount: '5', currency: 'IRR' },
    };
    await vault.saveVoucher(transfer);
    driver.vouchers.get('ITR-TR-CORRUPT')!.payload = '{corrupt-json!!';

    const purged = await vault.purgeExpired(90 * 24 * 60 * 60 * 1000);
    expect(purged).toBe(1);
    expect(await vault.getVoucher('ITR-TR-CORRUPT')).toBeNull();
  });
});
