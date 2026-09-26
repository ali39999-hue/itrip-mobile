import { describe, it, expect, beforeEach } from 'vitest';
import { MutationQueueEngine } from './mutationQueue';
import { __setVaultDriverForTests, type VaultDriver } from '@/services/db/driver';

/** In-memory SQLite mock driver for offline mutation queue tests */
class InMemoryDriver implements VaultDriver {
  readonly engine = 'expo-sqlite' as const;
  readonly encrypted = false;
  private rows: Map<string, Record<string, unknown>> = new Map();

  async run(sql: string, params: readonly unknown[]): Promise<void> {
    if (sql.includes('INSERT OR REPLACE INTO mutation_queue')) {
      const [id, timestamp, idempotency_key, mutation_type, payload, status] = params;
      this.rows.set(String(id), {
        id: String(id),
        timestamp: Number(timestamp),
        retry_count: 0,
        idempotency_key: String(idempotency_key),
        mutation_type: String(mutation_type),
        payload: String(payload),
        status: String(status),
        failure_reason: null,
        last_attempt_at: null,
      });
    } else if (sql.includes('UPDATE mutation_queue SET status')) {
      const [status, id] = params;
      const r = this.rows.get(String(id));
      if (r) {
        r.status = String(status);
      }
    }
  }

  async all<T>(sql: string): Promise<T[]> {
    if (sql.includes('SELECT * FROM mutation_queue')) {
      return Array.from(this.rows.values()) as T[];
    }
    return [];
  }

  async get<T>(): Promise<T | null> {
    return null;
  }

  async exec(): Promise<void> {}
}

describe('Offline Mutation Queue Engine (Phase 5)', () => {
  let queue: MutationQueueEngine;

  beforeEach(() => {
    __setVaultDriverForTests(new InMemoryDriver());
    queue = new MutationQueueEngine();
  });

  it('enqueues offline mutation with idempotency key and pending status', async () => {
    const mut = await queue.enqueue(
      'CANCEL_BOOKING',
      { bookingId: 'bk_test_1', reason: 'Travel plan changed' },
      'idem_key_1',
    );

    expect(mut.id).toMatch(/^mut-/);
    expect(mut.status).toBe('pending');
    expect(mut.mutationType).toBe('CANCEL_BOOKING');
    expect(mut.idempotencyKey).toBe('idem_key_1');
    expect(mut.retryCount).toBe(0);
  });

  it('lists pending mutations from storage', async () => {
    await queue.enqueue('UPDATE_PREFERENCES', { language: 'fa' });
    await queue.enqueue('OFFLINE_NOTE', { bookingRef: 'ITR-1', note: 'Meeting at terminal 2' });

    const pending = await queue.listPending();
    expect(pending).toHaveLength(2);
    expect(pending[0]?.mutationType).toBe('UPDATE_PREFERENCES');
    expect(pending[1]?.mutationType).toBe('OFFLINE_NOTE');
  });
});
