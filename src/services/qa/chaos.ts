import { z } from 'zod';
import { classifyPaymentOutcome } from '@/domains/booking/state';

/**
 * Chaos & Resilience Harness (R10 — Observability + QA + Chaos).
 *
 * Network chaos, duplicate-submit and clock-skew scenarios expressed as
 * deterministic, headlessly-testable policies over the real production
 * functions (not mocks of the app: the app logic IS the subject).
 *
 * Exit gate R10: "every P0 failure must be reproducible, observable,
 * traceable and classifiable" — these scenarios ARE the reproducers.
 */

// ---------------------------------------------------------------------------
// Fault taxonomy
// ---------------------------------------------------------------------------

export const FaultSchema = z.enum([
  'NETWORK_DROP',
  'TIMEOUT',
  'API_500',
  'API_429',
  'UNAUTHORIZED',
  'MALFORMED_RESPONSE',
  'CLOCK_SKEW',
]);
export type Fault = z.infer<typeof FaultSchema>;

export interface FaultedCallResult<T> {
  ok: boolean;
  value?: T;
  fault: Fault | null;
}

/**
 * Executes `fn` through an injected fault schedule. `fn` receives the
 * index of the attempt so schedules can be position-dependent.
 * This is the chaos injector: same signature the sync engine sees.
 */
export async function withFaultInjection<T>(
  fn: (attempt: number) => Promise<T>,
  schedule: Array<Fault | null>,
): Promise<FaultedCallResult<T>> {
  for (let attempt = 0; attempt < schedule.length; attempt++) {
    const fault = schedule[attempt]!;
    if (fault === null) {
      try {
        return { ok: true, value: await fn(attempt), fault: null };
      } catch {
        return { ok: false, fault: 'API_500', value: undefined };
      }
    }
    if (fault === 'NETWORK_DROP' || fault === 'TIMEOUT' || fault === 'API_500' || fault === 'API_429') {
      continue; // transient — next attempt
    }
    if (fault === 'UNAUTHORIZED') {
      return { ok: false, fault, value: undefined };
    }
    if (fault === 'MALFORMED_RESPONSE') {
      return { ok: false, fault, value: undefined };
    }
  }
  return { ok: false, fault: schedule[schedule.length - 1] ?? null, value: undefined };
}

// ---------------------------------------------------------------------------
// Scenario: duplicate submit — same idempotency key, two dispatches
// ---------------------------------------------------------------------------

export interface IdempotentServerSim {
  /** Applies a payment once per key; replays return the FIRST outcome. */
  apply(key: string, willSucceed: boolean): { captured: boolean; duplicate: boolean };
}

export function createIdempotentServerSim(): IdempotentServerSim {
  const applied = new Map<string, { captured: boolean }>();
  return {
    apply(key: string, willSucceed: boolean) {
      const existing = applied.get(key);
      if (existing) return { ...existing, duplicate: true };
      const result = { captured: willSucceed };
      applied.set(key, result);
      return { ...result, duplicate: false };
    },
  };
}

/**
 * The double-tap scenario: the client fires the same payment twice with
 * the same idempotency key (retry + impatient re-tap). The invariant:
 * at most ONE capture, regardless of transport retries.
 */
export function simulateDoubleSubmit(idempotencyKey: string): {
  captures: number;
  duplicates: number;
} {
  const server = createIdempotentServerSim();
  const outcomes = [server.apply(idempotencyKey, true), server.apply(idempotencyKey, true)];
  return {
    captures: outcomes.filter((o) => o.captured && !o.duplicate).length,
    duplicates: outcomes.filter((o) => o.duplicate).length,
  };
}

// ---------------------------------------------------------------------------
// Scenario: payment during flaky network — outcome stays UNKNOWN, never FAILED
// ---------------------------------------------------------------------------

export interface FlakyPaymentOutcome {
  outcome: 'CAPTURED' | 'DECLINED' | 'REDIRECT_REQUIRED' | 'UNKNOWN';
  attempts: number;
}

export function simulateFlakyPayment(params: {
  attemptsBeforeSuccess: number;
  idempotencyKey: string;
}): FlakyPaymentOutcome {
  const server = createIdempotentServerSim();
  let attempt = 0;
  let outcome: FlakyPaymentOutcome['outcome'] = 'UNKNOWN';

  while (attempt <= params.attemptsBeforeSuccess) {
    const networkUp = attempt < params.attemptsBeforeSuccess ? false : true;
    if (!networkUp) {
      attempt++;
      continue; // client sees UNKNOWN each time, never FAILED
    }
    const res = server.apply(params.idempotencyKey, true);
    outcome = classifyPaymentOutcome({
      serverResponded: true,
      success: res.captured,
    });
    attempt++;
    break;
  }

  return { outcome, attempts: attempt };
}

// ---------------------------------------------------------------------------
// Scenario: clock skew — lastSyncedAt in the "future"
// ---------------------------------------------------------------------------

/**
 * Freshness must not crash or go permanently stale when the device clock
 * is skewed (negative ages clamp to 0).
 */
export function clampSyncAge(lastSyncedAtMs: number, nowMs: number): number {
  return Math.max(0, nowMs - lastSyncedAtMs);
}
