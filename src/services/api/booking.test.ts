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
