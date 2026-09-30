import { describe, it, expect } from 'vitest';
import { classifyPaymentOutcome } from './state';

describe('Payment outcome classification (R4 anti-double-charge invariants)', () => {
  it('server capture with success=true → CAPTURED', () => {
    expect(
      classifyPaymentOutcome({ serverResponded: true, success: true }),
    ).toBe('CAPTURED');
  });

  it('3DS redirect url present → REDIRECT_REQUIRED (not failed, not captured)', () => {
    expect(
      classifyPaymentOutcome({
        serverResponded: true,
        success: false,
        redirectUrl: 'https://bank.example/3ds',
      }),
    ).toBe('REDIRECT_REQUIRED');
  });

  it('server definitively rejects → DECLINED (safe to retry in-place)', () => {
    expect(
      classifyPaymentOutcome({ serverResponded: true, success: false, paymentStatus: 'FAILED' }),
    ).toBe('DECLINED');
    expect(
      classifyPaymentOutcome({ serverResponded: true, success: false, paymentStatus: 'DECLINED' }),
    ).toBe('DECLINED');
    expect(
      classifyPaymentOutcome({ serverResponded: true, success: false, paymentStatus: 'REJECTED' }),
    ).toBe('DECLINED');
  });

  it('ambiguous server statuses (PENDING/PROCESSING) → UNKNOWN, never FAILED', () => {
    expect(
      classifyPaymentOutcome({ serverResponded: true, success: false, paymentStatus: 'PENDING' }),
    ).toBe('UNKNOWN');
    expect(
      classifyPaymentOutcome({ serverResponded: true, success: false, paymentStatus: 'PROCESSING' }),
    ).toBe('UNKNOWN');
  });

  it('network drop mid-capture (server not responded) → UNKNOWN (never FAILED)', () => {
    expect(classifyPaymentOutcome({ serverResponded: false })).toBe('UNKNOWN');
  });

  it('server success=false with no status → UNKNOWN (ambiguous)', () => {
    expect(
      classifyPaymentOutcome({ serverResponded: true, success: false }),
    ).toBe('UNKNOWN');
  });
});
