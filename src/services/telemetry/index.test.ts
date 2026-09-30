import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeMetadata,
  telemetry,
} from './index';

describe('telemetry sanitization (R1 security invariants)', () => {
  beforeEach(() => {
    telemetry.clearBuffer();
  });

  it('redacts authorization tokens', () => {
    const out = sanitizeMetadata({ Authorization: 'Bearer abc.def.ghi' });
    expect(out).toEqual({ Authorization: '[REDACTED]' });
  });

  it('redacts access/refresh tokens regardless of case', () => {
    const out = sanitizeMetadata({
      accessToken: 'sk-123',
      REFRESHTOKEN: 'rt-456',
      Token: 't-789',
    });
    expect(out).toEqual({
      accessToken: '[REDACTED]',
      REFRESHTOKEN: '[REDACTED]',
      Token: '[REDACTED]',
    });
  });

  it('redacts financial identity fields', () => {
    const out = sanitizeMetadata({
      cvv: '123',
      cardNumber: '4111111111111111',
      passport: 'X1234567',
      nationalId: '0012345678',
      password: 'hunter2',
      otp: '000000',
    });
    expect(out).toEqual({
      cvv: '[REDACTED]',
      cardNumber: '[REDACTED]',
      passport: '[REDACTED]',
      nationalId: '[REDACTED]',
      password: '[REDACTED]',
      otp: '[REDACTED]',
    });
  });

  it('keeps non-sensitive fields untouched', () => {
    const out = sanitizeMetadata({ status: 401, durationMs: 1234, endpoint: '/hotels/search' });
    expect(out).toEqual({ status: 401, durationMs: 1234, endpoint: '/hotels/search' });
  });

  it('redacts nested objects recursively', () => {
    const out = sanitizeMetadata({
      request: { headers: { Authorization: 'Bearer x' }, url: '/user/profile' },
    });
    expect(out).toEqual({
      request: { headers: { Authorization: '[REDACTED]' }, url: '/user/profile' },
    });
  });

  it('record() buffers a sanitized event and grows buffer', () => {
    telemetry.record('ERROR', 'test-event', { token: 'secret', ok: 1 });
    const size = telemetry.getBufferSize();
    expect(size).toBeGreaterThan(0);
    telemetry.clearBuffer();
    expect(telemetry.getBufferSize()).toBe(0);
  });

  it('buffer is capped at BUFFER_MAX_SIZE (50)', () => {
    for (let i = 0; i < 70; i++) {
      telemetry.record('SYNC_EVENT', `evt-${i}`, { i });
    }
    expect(telemetry.getBufferSize()).toBeLessThanOrEqual(50);
    telemetry.clearBuffer();
  });
});
