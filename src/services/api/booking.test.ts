import { describe, it, expect, vi } from 'vitest';
import { createBookingService } from './booking';
import type { AxiosInstance } from 'axios';

describe('Booking API Service (Server-Authoritative)', () => {
  it('validates price quotes before checkout', async () => {
    const mockAxios = {
      post: vi.fn().mockResolvedValue({
        data: {
          valid: true,
          quoteId: 'quote-test-123',
          serverAmount: '45.00',
          serverCurrency: 'USD',
          expiresAt: '2026-11-01T12:00:00Z',
          priceMismatch: false,
        },
      }),
    } as unknown as AxiosInstance;

    const service = createBookingService(mockAxios);
    const quote = await service.validateQuote({
      type: 'FLIGHT',
      itemId: 'fl-1',
      expectedAmount: '45.00',
      expectedCurrency: 'USD',
    });

    expect(quote.valid).toBe(true);
    expect(quote.quoteId).toBe('quote-test-123');
    expect(quote.serverAmount).toBe('45.00');
    expect(quote.priceMismatch).toBe(false);
  });

  it('strictly throws when quote validation fails on server — no silent true fallback', async () => {
    const mockAxios = {
      post: vi.fn().mockRejectedValue({
        response: { data: { error: 'Price expired on GDS' } },
      }),
    } as unknown as AxiosInstance;

    const service = createBookingService(mockAxios);
    await expect(
      service.validateQuote({
        type: 'FLIGHT',
        itemId: 'fl-expired',
        expectedAmount: '45.00',
        expectedCurrency: 'USD',
      }),
    ).rejects.toThrow(/Quote verification error: Price expired on GDS/);
  });

  it('creates an authoritative booking draft hold on the server', async () => {
    const mockAxios = {
      post: vi.fn().mockResolvedValue({
        data: {
          success: true,
          bookingId: 'bk_srv_99182',
          reference: 'ITR-FL-89X2',
          totalAmount: 45.0,
          currency: 'USD',
          status: 'HELD',
        },
      }),
    } as unknown as AxiosInstance;

    const service = createBookingService(mockAxios);
    const draft = await service.createDraft({
      idempotencyKey: 'idem-test-uuid',
      type: 'FLIGHT',
      itemId: 'fl-1',
      itemTitle: 'W5 1042 (IKA → SYZ)',
      count: 1,
      travelDate: '2026-11-01',
      passengers: [{ firstName: 'Sarah', lastName: 'Smith' }],
      contactPhone: '+989120000000',
      source: 'MOBILE',
    });

    expect(draft.success).toBe(true);
    expect(draft.bookingId).toBe('bk_srv_99182');
    expect(draft.reference).toBe('ITR-FL-89X2');
    expect(draft.status).toBe('HELD');
  });

  it('strictly throws when server draft creation fails — no fake booking reference generated', async () => {
    const mockAxios = {
      post: vi.fn().mockRejectedValue({
        response: { data: { error: 'Allotment sold out' } },
      }),
    } as unknown as AxiosInstance;

    const service = createBookingService(mockAxios);
    await expect(
      service.createDraft({
        idempotencyKey: 'idem-fail-uuid',
        type: 'FLIGHT',
        itemId: 'fl-sold-out',
        itemTitle: 'W5 1042',
        count: 1,
        travelDate: '2026-11-01',
        passengers: [{ firstName: 'Sarah', lastName: 'Smith' }],
        contactPhone: '+989120000000',
        source: 'MOBILE',
      }),
    ).rejects.toThrow(/Booking draft creation failed: Allotment sold out/);
  });

  it('executes server payment confirmation and returns PNR', async () => {
    const mockAxios = {
      post: vi.fn().mockResolvedValue({
        data: {
          success: true,
          bookingId: 'bk_srv_99182',
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'CAPTURED',
          pnr: 'W598X1',
        },
      }),
    } as unknown as AxiosInstance;

    const service = createBookingService(mockAxios);
    const confirmation = await service.confirmPayment({
      bookingId: 'bk_srv_99182',
      method: 'wallet_irr',
      idempotencyKey: 'idem-pay-uuid',
    });

    expect(confirmation.success).toBe(true);
    expect(confirmation.bookingStatus).toBe('CONFIRMED');
    expect(confirmation.paymentStatus).toBe('CAPTURED');
    expect(confirmation.pnr).toBe('W598X1');
  });

  it('strictly fails payment when server capture declines — no client-fabricated CAPTURED status', async () => {
    const mockAxios = {
      post: vi.fn().mockRejectedValue({
        response: { data: { error: 'Card balance insufficient' } },
      }),
    } as unknown as AxiosInstance;

    const service = createBookingService(mockAxios);
    const confirmation = await service.confirmPayment({
      bookingId: 'bk_srv_declined',
      method: 'gateway_shetab',
      idempotencyKey: 'idem-pay-fail',
    });

    expect(confirmation.success).toBe(false);
    expect(confirmation.error).toBe('Card balance insufficient');
    expect(confirmation.bookingStatus).toBeUndefined();
    expect(confirmation.paymentStatus).toBeUndefined();
  });

  it('requests booking cancellation through server state machine', async () => {
    const mockAxios = {
      post: vi.fn().mockResolvedValue({
        data: { success: true },
      }),
    } as unknown as AxiosInstance;

    const service = createBookingService(mockAxios);
    const res = await service.requestCancellation('bk_srv_99182', 'Change of plans');
    expect(res.success).toBe(true);
  });
});
