import { getVaultDriver, type VaultDriver } from '@/services/db/driver';
import { bookingService, api } from '@/services/api';

/**
 * Offline Mutation Queue (Phase 5 — Offline-First Implementation).
 *
 * Architecture:
 * Local Action → Persistent SQLite Queue → Connectivity Detection →
 * Exponential Backoff Retries → Server Sync → Conflict Resolution
 *
 * Invariants:
 * - Every mutation has an immutable unique ID and idempotency key.
 * - Max 5 retries with exponential backoff and jitter.
 * - Server is the authoritative financial source of truth.
 */

export type MutationType =
  | 'CANCEL_BOOKING'
  | 'UPDATE_PASSENGER'
  | 'UPDATE_PREFERENCES'
  | 'OFFLINE_NOTE';

export type MutationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueuedMutation<T = unknown> {
  id: string;
  timestamp: number;
  retryCount: number;
  idempotencyKey: string;
  mutationType: MutationType;
  payload: T;
  status: MutationStatus;
  failureReason: string | null;
  lastAttemptAt: number | null;
}

interface MutationRow {
  id: string;
  timestamp: number;
  retry_count: number;
  idempotency_key: string;
  mutation_type: string;
  payload: string;
  status: string;
  failure_reason: string | null;
  last_attempt_at: number | null;
}

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 2000;

function calculateBackoffMs(retryCount: number): number {
  const exponential = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
  const jitter = Math.floor(Math.random() * 1000);
  return Math.min(exponential + jitter, 60_000);
}

export class MutationQueueEngine {
  private processing = false;

  private async getDb(): Promise<VaultDriver> {
    return getVaultDriver();
  }

  /**
   * Enqueues an offline mutation with an idempotency key.
   * If a mutation with the same idempotency key already exists, ignores or updates it.
   */
  async enqueue<T>(
    mutationType: MutationType,
    payload: T,
    customIdempotencyKey?: string,
  ): Promise<QueuedMutation<T>> {
    const db = await this.getDb();
    const id = `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const idempotencyKey = customIdempotencyKey || `idem-${id}`;
    const timestamp = Date.now();

    await db.run(
      `INSERT OR REPLACE INTO mutation_queue
       (id, timestamp, retry_count, idempotency_key, mutation_type, payload, status, failure_reason, last_attempt_at)
       VALUES (?, ?, 0, ?, ?, ?, 'pending', NULL, NULL)`,
      [id, timestamp, idempotencyKey, mutationType, JSON.stringify(payload)],
    );

    return {
      id,
      timestamp,
      retryCount: 0,
      idempotencyKey,
      mutationType,
      payload,
      status: 'pending',
      failureReason: null,
      lastAttemptAt: null,
    };
  }

  /**
   * Lists all pending or failed mutations in order of timestamp.
   */
  async listPending(): Promise<QueuedMutation[]> {
    const db = await this.getDb();
    const rows = await db.all<MutationRow>(
      `SELECT * FROM mutation_queue WHERE status IN ('pending', 'failed') AND retry_count < ? ORDER BY timestamp ASC`,
      [MAX_RETRIES],
    );

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      retryCount: r.retry_count,
      idempotencyKey: r.idempotency_key,
      mutationType: r.mutation_type as MutationType,
      payload: JSON.parse(r.payload),
      status: r.status as MutationStatus,
      failureReason: r.failure_reason,
      lastAttemptAt: r.last_attempt_at,
    }));
  }

  /**
   * Processes all pending mutations in the queue sequentially.
   * Called on network restoration, app foreground, and background sync.
   */
  async processQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.processing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.processing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const items = await this.listPending();
      const now = Date.now();

      for (const item of items) {
        // Enforce exponential backoff delay
        if (item.lastAttemptAt) {
          const requiredDelay = calculateBackoffMs(item.retryCount);
          if (now - item.lastAttemptAt < requiredDelay) {
            continue; // Not ready for retry yet
          }
        }

        processed++;
        const success = await this.executeMutation(item);
        if (success) {
          succeeded++;
        } else {
          failed++;
        }
      }
    } finally {
      this.processing = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Dispatches a specific mutation to its server handler.
   */
  private async executeMutation(item: QueuedMutation): Promise<boolean> {
    const db = await this.getDb();
    const now = Date.now();

    try {
      await db.run(
        `UPDATE mutation_queue SET status = 'processing', last_attempt_at = ? WHERE id = ?`,
        [now, item.id],
      );

      switch (item.mutationType) {
        case 'CANCEL_BOOKING': {
          const { bookingId, reason } = item.payload as { bookingId: string; reason?: string };
          const res = await bookingService.requestCancellation(bookingId, reason);
          if (!res.success) throw new Error(res.error || 'Server cancellation rejected');
          break;
        }

        case 'UPDATE_PASSENGER': {
          const { passenger } = item.payload as { passenger: Record<string, unknown> };
          await api.post('/passengers/update', { passenger, idempotencyKey: item.idempotencyKey });
          break;
        }

        case 'UPDATE_PREFERENCES': {
          const { preferences } = item.payload as { preferences: Record<string, unknown> };
          await api.post('/user/preferences', preferences);
          break;
        }

        case 'OFFLINE_NOTE': {
          const { bookingRef, note } = item.payload as { bookingRef: string; note: string };
          await api.post(`/bookings/${encodeURIComponent(bookingRef)}/notes`, { note });
          break;
        }

        default:
          throw new Error(`Unknown mutation type: ${item.mutationType}`);
      }

      // Mark mutation as completed
      await db.run(
        `UPDATE mutation_queue SET status = 'completed', failure_reason = NULL WHERE id = ?`,
        [item.id],
      );
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const nextRetries = item.retryCount + 1;
      const nextStatus = nextRetries >= MAX_RETRIES ? 'failed' : 'pending';

      await db.run(
        `UPDATE mutation_queue SET status = ?, retry_count = ?, failure_reason = ? WHERE id = ?`,
        [nextStatus, nextRetries, errorMsg, item.id],
      );
      return false;
    }
  }

  /**
   * Removes completed mutations older than retentionMs (default 7 days).
   */
  async purgeCompleted(retentionMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await this.getDb();
    const cutoff = Date.now() - retentionMs;
    await db.run(
      `DELETE FROM mutation_queue WHERE status = 'completed' AND timestamp < ?`,
      [cutoff],
    );
  }
}

export const mutationQueue = new MutationQueueEngine();
