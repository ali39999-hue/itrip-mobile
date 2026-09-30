import { describe, it, expect } from 'vitest';
import {
  DEAD_LETTER_TABLE_DDL,
  rowToDeadLetter,
  buildDeadLetterEntry,
  isPendingReview,
  classifyFailure,
  type DeadLetterRow,
} from './deadLetterQueue';
import type { QueuedMutation } from './mutationQueue';

function makeMutation(overrides: Partial<QueuedMutation> = {}): QueuedMutation {
  return {
    id: 'mut-123-abcd',
    timestamp: Date.now() - 60_000,
    retryCount: 5,
    idempotencyKey: 'idem-key-99',
    mutationType: 'CANCEL_BOOKING',
    payload: { bookingId: 'bk-77', reason: 'plan change' },
    status: 'failed',
    failureReason: 'Server cancellation rejected',
    lastAttemptAt: Date.now() - 1000,
    ...overrides,
  };
}

describe('Dead-Letter Queue (R2 sync reliability)', () => {
  it('DDL creates dead_letter_queue table with resolution index', () => {
    expect(DEAD_LETTER_TABLE_DDL).toContain('CREATE TABLE IF NOT EXISTS dead_letter_queue');
    expect(DEAD_LETTER_TABLE_DDL).toContain('idx_dlq_resolution');
  });

  it('buildDeadLetterEntry preserves payload and idempotency key for safe replay', () => {
    const mut = makeMutation({ retryCount: 5 });
    const entry = buildDeadLetterEntry(mut, 'exhausted retries');
    expect(entry.id).toBe('dlq-mut-123-abcd');
    expect(entry.originalId).toBe('mut-123-abcd');
    expect(entry.idempotencyKey).toBe('idem-key-99');
    expect(entry.payload).toEqual({ bookingId: 'bk-77', reason: 'plan change' });
    expect(entry.attempts).toBe(5);
    expect(entry.resolution).toBe('PENDING_REVIEW');
    expect(isPendingReview(entry)).toBe(true);
  });

  it('rowToDeadLetter round-trips a persisted row', () => {
    const mut = makeMutation();
    const entry = buildDeadLetterEntry(mut, 'boom');
    const row: DeadLetterRow = {
      id: entry.id,
      original_id: entry.originalId,
      mutation_type: entry.mutationType,
      payload: JSON.stringify(entry.payload),
      idempotency_key: entry.idempotencyKey,
      failure_reason: entry.failureReason,
      attempts: entry.attempts,
      first_failed_at: entry.firstFailedAt,
      last_attempt_at: entry.lastAttemptAt,
      resolved_at: null,
      resolution: 'PENDING_REVIEW',
    };
    const back = rowToDeadLetter(row);
    expect(back).toEqual(entry);
  });

  it('classifyFailure: network errors are retryable', () => {
    expect(classifyFailure('connection timeout')).toEqual({ category: 'NETWORK', isRetryable: true });
    expect(classifyFailure('Network request failed')).toEqual({ category: 'NETWORK', isRetryable: true });
  });

  it('classifyFailure: 401/auth errors are retryable (token refresh path)', () => {
    expect(classifyFailure('401 Unauthorized')).toEqual({ category: 'AUTH', isRetryable: true });
  });

  it('classifyFailure: conflict (409) and validation (422) are NOT auto-retryable', () => {
    expect(classifyFailure('409 conflict: booking already cancelled')).toEqual({
      category: 'CONFLICT',
      isRetryable: false,
    });
    expect(classifyFailure('422 validation failed: invalid passenger')).toEqual({
      category: 'VALIDATION',
      isRetryable: false,
    });
  });

  it('classifyFailure: server 500 is retryable', () => {
    expect(classifyFailure('500 server error')).toEqual({ category: 'SERVER', isRetryable: true });
  });

  it('classifyFailure: unknown message defaults to retryable UNKNOWN', () => {
    expect(classifyFailure('something odd')).toEqual({ category: 'UNKNOWN', isRetryable: true });
  });
});
