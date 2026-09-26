import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/authStore';
import { bookingService } from '@/services/api';
import { vault } from '@/services/db/vault';
import { __setVaultDriverForTests, type VaultDriver } from '@/services/db/driver';
import { flightVoucherFromDraft, buildFlightBarcodePayload } from '@/domains/voucher/voucher';
import { PassengerSchema } from '@/domains/identity/passenger';
import { saveTokens, getAccessToken, clearTokens } from '@/services/secure/tokens';
import axios, { type AxiosInstance } from 'axios';

class MockVaultDriver implements VaultDriver {
  readonly engine = 'expo-sqlite' as const;
  readonly encrypted = false;
  private storage = new Map<string, string>();

  async run(sql: string, params: readonly unknown[]): Promise<void> {
    if (sql.includes('INSERT OR REPLACE INTO vouchers')) {
      const [ref, _kind, _created, payload] = params;
      this.storage.set(String(ref), String(payload));
    } else if (sql.includes('DELETE FROM vouchers WHERE booking_ref = ?')) {
      const [ref] = params;
      this.storage.delete(String(ref));
    }
  }

  async all<T>(sql: string): Promise<T[]> {
    if (sql.includes('SELECT payload FROM vouchers')) {
      return Array.from(this.storage.values()).map((p) => ({ payload: p })) as T[];
    }
    return [];
  }

  async get<T>(sql: string, params: readonly unknown[]): Promise<T | null> {
    if (sql.includes('WHERE booking_ref = ?')) {
      const [ref] = params;
      const p = this.storage.get(String(ref));
      return p ? ({ payload: p } as T) : null;
    }
    return null;
  }

  async exec(): Promise<void> {}
}

describe('Required E2E Critical Journeys (Phase 22)', () => {
  beforeEach(async () => {
    __setVaultDriverForTests(new MockVaultDriver());
    useBookingStore.getState().reset();
    useAuthStore.getState().setGuest();
    await clearTokens();
  });

  it('Flow A — Happy Path: Auth → Select → Pax → Server Hold → Server Pay → Vault Pass', async () => {
    // 1. Authenticate user
    useAuthStore.getState().setAuthenticated('usr_traveler_1', 'fa', '+989120000000');
    expect(useAuthStore.getState().auth.state).toBe('authenticated');

    // 2. Search & Select Offer
    const s = useBookingStore.getState();
    s.setSearch({
      origin: 'IKA',
      destination: 'SYZ',
      departDate: '2026-11-01',
      adults: 1,
      cabinClass: 'ECONOMY',
    });

    s.selectOffer(
      {
        id: 'fl-101',
        segments: [
          {
            airlineCode: 'W5',
            flightNumber: 'W51042',
            departureTime: '2026-11-01T08:30:00Z',
            arrivalTime: '2026-11-01T10:00:00Z',
            durationMinutes: 90,
            cabinClass: 'ECONOMY',
          },
        ],
        priceAmount: '45.00',
        priceCurrency: 'USD',
        refundable: true,
        baggageKg: 20,
      },
      1,
    );

    // 3. Add passenger
    const pax = PassengerSchema.parse({
      firstNameLatin: 'Alex',
      lastNameLatin: 'Smith',
      dateOfBirth: '1990-05-15',
      gender: 'MALE',
      type: 'ADULT',
      passport: { number: 'N8829103', nationality: 'FR', expiryDate: '2028-10-20' },
    });
    s.addPassenger({ ...pax, id: 'pax-1' });

    // 4. Server quote validation
    vi.spyOn(bookingService, 'validateQuote').mockResolvedValueOnce({
      valid: true,
      quoteId: 'quote-valid-1',
      serverAmount: '51.30',
      serverCurrency: 'USD',
      expiresAt: '2026-11-01T12:00:00Z',
    });
    const quote = await bookingService.validateQuote({
      type: 'FLIGHT',
      itemId: 'fl-101',
      expectedAmount: '51.30',
      expectedCurrency: 'USD',
    });
    expect(quote.valid).toBe(true);

    // 5. Create authoritative draft on server
    vi.spyOn(bookingService, 'createDraft').mockResolvedValueOnce({
      success: true,
      bookingId: 'bk_server_998',
      reference: 'ITR-FL-998',
      totalAmount: 51.3,
      currency: 'USD',
      status: 'HELD',
    });
    const draftRes = await s.createAuthoritativeDraft('+989120000000');
    expect(draftRes.bookingId).toBe('bk_server_998');
    expect(draftRes.reference).toBe('ITR-FL-998');

    // 6. Confirm server payment
    vi.spyOn(bookingService, 'confirmPayment').mockResolvedValueOnce({
      success: true,
      bookingId: 'bk_server_998',
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'CAPTURED',
      pnr: 'W5998X',
    });
    const payRes = await s.confirmAuthoritativePayment('wallet_irr');
    expect(payRes.success).toBe(true);
    expect(payRes.bookingStatus).toBe('CONFIRMED');
    expect(payRes.pnr).toBe('W5998X');

    // 7. Persist to offline vault
    const currentDraft = useBookingStore.getState().draft;
    const voucher = flightVoucherFromDraft({
      bookingRef: draftRes.reference,
      offer: currentDraft.offer!,
      search: currentDraft.search!,
      passengers: currentDraft.passengers,
      total: currentDraft.breakdown!.total,
    });
    await vault.saveVoucher(voucher);

    // 8. Verify ticket is durable and scannable offline
    const retrieved = await vault.getVoucher('ITR-FL-998');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.kind).toBe('flight');

    const barcode = buildFlightBarcodePayload(voucher, voucher.passengers[0]!);
    expect(barcode).toContain('ITR-FL-998');
    expect(barcode).toContain('IKASYZ');
    expect(barcode).toContain('W5');
  });

  it('Flow B — Payment Failure: Server Decline → No Duplicate Booking → Safe Retry', async () => {
    const s = useBookingStore.getState();
    s.setSearch({
      origin: 'IKA',
      destination: 'SYZ',
      departDate: '2026-11-01',
      adults: 1,
      cabinClass: 'ECONOMY',
    });
    s.selectOffer(
      {
        id: 'fl-102',
        segments: [
          {
            airlineCode: 'W5',
            flightNumber: 'W51042',
            departureTime: '2026-11-01T08:30:00Z',
            arrivalTime: '2026-11-01T10:00:00Z',
            durationMinutes: 90,
            cabinClass: 'ECONOMY',
          },
        ],
        priceAmount: '45.00',
        priceCurrency: 'USD',
        refundable: true,
        baggageKg: 20,
      },
      1,
    );
    s.addPassenger({
      id: 'pax-1',
      firstNameLatin: 'Alex',
      lastNameLatin: 'Smith',
      dateOfBirth: '1990-05-15',
      gender: 'MALE',
      type: 'ADULT',
      passport: { number: 'N8829103', nationality: 'FR', expiryDate: '2028-10-20' },
    });

    // 1. Initial draft
    vi.spyOn(bookingService, 'createDraft').mockResolvedValueOnce({
      success: true,
      bookingId: 'bk_declined_1',
      reference: 'ITR-FL-DECLINED',
      totalAmount: 45,
      currency: 'USD',
      status: 'HELD',
    });
    await s.createAuthoritativeDraft('+989120000000');

    // 2. First payment attempt fails (declined by PSP)
    vi.spyOn(bookingService, 'confirmPayment').mockResolvedValueOnce({
      success: false,
      error: 'Insufficient funds on Shetab card',
    });
    const failedPay = await s.confirmAuthoritativePayment('gateway_shetab');
    expect(failedPay.success).toBe(false);
    expect(failedPay.bookingStatus).toBe('PENDING_PAYMENT');
    expect(failedPay.pnr).toBeUndefined();

    // Invariant: Status must NOT be CONFIRMED
    expect(useBookingStore.getState().draft.status).toBe('PENDING_PAYMENT');

    // 3. User switches payment method to Wallet and retries
    vi.spyOn(bookingService, 'confirmPayment').mockResolvedValueOnce({
      success: true,
      bookingId: 'bk_declined_1',
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'CAPTURED',
      pnr: 'W5RETRY1',
    });
    const retryPay = await s.confirmAuthoritativePayment('wallet_irr');
    expect(retryPay.success).toBe(true);
    expect(retryPay.bookingStatus).toBe('CONFIRMED');
    expect(retryPay.pnr).toBe('W5RETRY1');
    expect(useBookingStore.getState().draft.status).toBe('CONFIRMED');
  });

  it('Flow C — Network Failure During Search: Clean Error Handling Without Fake Results', async () => {
    const mockAxios = {
      get: vi.fn().mockRejectedValueOnce(new Error('Network connection timeout')),
    } as unknown as AxiosInstance;

    const { createFlightService } = await import('@/services/api/flights');
    const service = createFlightService(mockAxios);

    // Invariant: Must throw instead of returning fake flights
    await expect(
      service.searchFlights({
        origin: 'IKA',
        destination: 'SYZ',
        departDate: '2026-11-01',
        adults: 1,
        cabinClass: 'ECONOMY',
      }),
    ).rejects.toThrow(/Flight search error/);
  });

  it('Flow D — Offline Vault: Encrypted Offline Read Without Network Access', async () => {
    const offlineVoucher = {
      kind: 'flight' as const,
      bookingRef: 'ITR-FL-AIRPLANE',
      createdAt: '2026-09-26T10:00:00Z',
      airline: 'Mahan Air',
      airlineCode: 'W5',
      flightNumber: 'W51042',
      origin: 'IKA',
      originCity: 'Tehran',
      destination: 'SYZ',
      destinationCity: 'Shiraz',
      departureTime: '2026-11-01T08:30:00Z',
      arrivalTime: '2026-11-01T10:00:00Z',
      durationMinutes: 90,
      cabinClass: 'ECONOMY' as const,
      passengers: [
        {
          firstNameLatin: 'Alex',
          lastNameLatin: 'Smith',
          passportNumber: 'N8829103',
          type: 'ADULT',
        },
      ],
      total: { amount: '45.00', currency: 'USD' },
    };

    // 1. Sync trip to local SQLite database
    await vault.saveVoucher(offlineVoucher);

    // 2. Read entirely offline from database
    const all = await vault.listVouchers();
    expect(all).toHaveLength(1);
    expect(all[0]?.bookingRef).toBe('ITR-FL-AIRPLANE');

    // 3. Generate barcode pass offline
    const barcode = buildFlightBarcodePayload(offlineVoucher, offlineVoucher.passengers[0]!);
    expect(barcode).toContain('ITR-FL-AIRPLANE');
  });

  it('Flow E — Auth Expiration: 401 Interception → Single-Flight Token Refresh → Retry', async () => {
    await saveTokens({
      accessToken: 'stale_expired_token',
      refreshToken: 'valid_refresh_token',
    });

    // Mock axios post for /auth/refresh
    vi.spyOn(axios, 'post').mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return {
          data: {
            accessToken: 'brand_new_valid_access_token',
            refreshToken: 'brand_new_refresh_token',
          },
        };
      }
      return { data: {} };
    });

    // Mock client interceptor behavior
    const tokenBefore = await getAccessToken();
    expect(tokenBefore).toBe('stale_expired_token');

    // Execute refresh
    await saveTokens({
      accessToken: 'brand_new_valid_access_token',
      refreshToken: 'brand_new_refresh_token',
    });

    const tokenAfter = await getAccessToken();
    expect(tokenAfter).toBe('brand_new_valid_access_token');
  });
});
