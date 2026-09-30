import type { MutationType, QueuedMutation } from './mutationQueue';

/**
 * Dead-Letter Queue (R2 — Data + Sync Reliability).
 *
 * Mutations that exhaust MAX_RETRIES move to `failed` status in the live
 * queue. A dead-letter row is the *durable forensic record* of a mutation
 * the server never accepted — it must be observable, classifiable and
 * manually re-drivable. It is never silently deleted.
 *
 * Invariants:
 * - A dead-letter entry keeps the original payload and idempotency key
 *   (replaying with the same key can never double-apply server-side).
 * - Entries are user-visible ("needs attention") until explicitly
 *   resolved (retry succeeded, discarded, or fixed & re-enqueued).
 */

export interface DeadLetterEntry<T = unknown> {
  id: string;
  originalId: string;
  mutationType: MutationType;
  payload: T;
  idempotencyKey: string;
  failureReason: string;
  attempts: number;
  firstFailedAt: number;
  lastAttemptAt: number | null;
  resolvedAt: number | null;
  resolution: 'PENDING_REVIEW' | 'RETRIED_OK' | 'DISCARDED_BY_USER' | 'RE_ENQUEUED';
}

export interface DeadLetterRow {
  id: string;
  original_id: string;
  mutation_type: string;
  payload: string;
  idempotency_key: string;
  failure_reason: string;
  attempts: number;
  first_failed_at: number;
  last_attempt_at: number | null;
  resolved_at: number | null;
  resolution: string;
}

export const DEAD_LETTER_TABLE_DDL = `
    CREATE TABLE IF NOT EXISTS dead_letter_queue (
      id TEXT PRIMARY KEY NOT NULL,
      original_id TEXT NOT NULL,
      mutation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      failure_reason TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      first_failed_at INTEGER NOT NULL,
      last_attempt_at INTEGER,
      resolved_at INTEGER,
      resolution TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
    );
    CREATE INDEX IF NOT EXISTS idx_dlq_resolution ON dead_letter_queue(resolution);
`;

export function rowToDeadLetter(row: DeadLetterRow): DeadLetterEntry {
  return {
    id: row.id,
    originalId: row.original_id,
    mutationType: row.mutation_type as MutationType,
    payload: JSON.parse(row.payload) as unknown,
    idempotencyKey: row.idempotency_key,
    failureReason: row.failure_reason,
    attempts: row.attempts,
    firstFailedAt: row.first_failed_at,
    lastAttemptAt: row.last_attempt_at,
    resolvedAt: row.resolved_at,
    resolution: row.resolution as DeadLetterEntry['resolution'],
  };
}

/** Builds the durable record for a mutation that exhausted its retries. */
export function buildDeadLetterEntry(
  mutation: QueuedMutation,
  finalError: string,
): DeadLetterEntry {
  return {
    id: `dlq-${mutation.id}`,
    originalId: mutation.id,
    mutationType: mutation.mutationType,
    payload: mutation.payload,
    idempotencyKey: mutation.idempotencyKey,
    failureReason: finalError,
    attempts: mutation.retryCount,
    firstFailedAt: Date.now(),
    lastAttemptAt: mutation.lastAttemptAt,
    resolvedAt: null,
    resolution: 'PENDING_REVIEW',
  };
}

export function isPendingReview(entry: DeadLetterEntry): boolean {
  return entry.resolution === 'PENDING_REVIEW';
}

export function classifyFailure(errorMsg: string): {
  category: 'NETWORK' | 'AUTH' | 'CONFLICT' | 'VALIDATION' | 'SERVER' | 'UNKNOWN';
  isRetryable: boolean;
} {
  const msg = errorMsg.toLowerCase();
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('connection')) {
    return { category: 'NETWORK', isRetryable: true };
  }
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token')) {
    return { category: 'AUTH', isRetryable: true };
  }
  if (msg.includes('conflict') || msg.includes('409')) {
    return { category: 'CONFLICT', isRetryable: false };
  }
  if (msg.includes('422') || msg.includes('validation') || msg.includes('invalid')) {
    return { category: 'VALIDATION', isRetryable: false };
  }
  if (msg.includes('500') || msg.includes('server')) {
    return { category: 'SERVER', isRetryable: true };
  }
  return { category: 'UNKNOWN', isRetryable: true };
}
