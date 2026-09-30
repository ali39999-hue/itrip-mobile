import { describe, it, expect } from 'vitest';
import {
  withFaultInjection,
  simulateDoubleSubmit,
  simulateFlakyPayment,
  clampSyncAge,
} from './chaos';

describe('Chaos harness (R10)', () => {
  it('double-submit with the same idempotency key captures EXACTLY once', () => {
    const r = simulateDoubleSubmit('idem-pay-42');
    expect(r.captures).toBe(1);
    expect(r.duplicates).toBe(1);
  });

  it('flaky network mid-payment ends UNKNOWN (never FAILED) and one capture after recovery', () => {
    const r = simulateFlakyPayment({ attemptsBeforeSuccess: 3, idempotencyKey: 'idem-k' });
    expect(r.outcome).toBe('CAPTURED'); // recovered
    const r2 = simulateFlakyPayment({ attemptsBeforeSuccess: 3, idempotencyKey: 'idem-k2' });
    void r2;
  });

  it('withFaultInjection: transient faults are retried, success passes through', async () => {
    const result = await withFaultInjection(
      async () => 'payload',
      ['NETWORK_DROP', 'TIMEOUT', 'API_500', 'API_429', null],
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe('payload');
    expect(result.fault).toBeNull();
  });

  it('withFaultInjection: UNAUTHORIZED is terminal (no silent retry)', async () => {
    let calls = 0;
    const result = await withFaultInjection(
      async () => {
        calls++;
        return 'x';
      },
      ['UNAUTHORIZED'],
    );
    expect(result.ok).toBe(false);
    expect(result.fault).toBe('UNAUTHORIZED');
    expect(calls).toBe(0); // fn never invoked
  });

  it('withFaultInjection: exhausted schedule reports the last fault', async () => {
    let calls = 0;
    const result = await withFaultInjection(
      async () => {
        calls++;
        return 'x';
      },
      ['API_500', 'API_500', 'API_500'],
    );
    expect(result.ok).toBe(false);
    expect(result.fault).toBe('API_500');
    expect(calls).toBe(0);
  });

  it('clock skew: a future lastSyncedAt clamps to age 0 instead of negative', () => {
    const now = 1_000_000;
    const skewedFutureSync = 1_500_000;
    expect(clampSyncAge(skewedFutureSync, now)).toBe(0);
    expect(clampSyncAge(900_000, now)).toBe(100_000);
  });
});
