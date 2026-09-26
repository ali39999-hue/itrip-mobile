import { describe, it, expect, beforeEach } from 'vitest';
import { telemetry, sanitizeMetadata } from './index';

describe('Telemetry & Observability Engine', () => {
  beforeEach(() => {
    telemetry.clearBuffer();
  });

  it('redacts sensitive credentials, tokens, and PII from metadata', () => {
    const raw = {
      user: 'test_user',
      password: 'super_secret_password',
      token: 'jwt.token.secret',
      nested: {
        accessToken: 'access_secret',
        cvv: '123',
        safeKey: 'hello',
      },
    };

    const clean = sanitizeMetadata(raw) as Record<string, unknown>;
    expect(clean.user).toBe('test_user');
    expect(clean.password).toBe('[REDACTED]');
    expect(clean.token).toBe('[REDACTED]');
    expect((clean.nested as Record<string, unknown>).accessToken).toBe('[REDACTED]');
    expect((clean.nested as Record<string, unknown>).cvv).toBe('[REDACTED]');
    expect((clean.nested as Record<string, unknown>).safeKey).toBe('hello');
  });

  it('buffers error events without throwing', () => {
    telemetry.recordError('TestContext', new Error('Network timeout'), { route: '/booking' });
    expect(telemetry.getBufferSize()).toBe(1);
  });

  it('records booking and payment events with sanitized payload', () => {
    telemetry.recordBookingEvent('CHECKOUT_INITIATED', 'bk_123', 'HELD');
    telemetry.recordPaymentEvent('GATEWAY_ATTEMPT', 'wallet_irr', 'CAPTURED');
    expect(telemetry.getBufferSize()).toBe(2);
  });
});
