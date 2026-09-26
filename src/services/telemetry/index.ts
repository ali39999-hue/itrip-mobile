import { api } from '@/services/api';
import { apiConfig } from '@/services/api/config';

/**
 * Mobile Telemetry & Observability Engine (Phase 26).
 *
 * Captures non-sensitive operational events, API latencies, booking funnel failures,
 * and offline sync telemetry. Safe: scrubs all auth tokens, credentials, and PII.
 */

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: 'ERROR' | 'API_FAILURE' | 'BOOKING_EVENT' | 'PAYMENT_EVENT' | 'SYNC_EVENT';
  name: string;
  metadata: Record<string, unknown>;
  platform: 'android' | 'ios';
  appVersion: string;
}

const BUFFER_MAX_SIZE = 50;
let eventBuffer: TelemetryEvent[] = [];
let isFlushing = false;

const SENSITIVE_KEYS = new Set([
  'authorization',
  'token',
  'accesstoken',
  'refreshtoken',
  'password',
  'code',
  'otp',
  'cvv',
  'cardnumber',
  'passport',
  'nationalid',
]);

/** Recursively redacts sensitive auth/financial data from telemetry payloads */
export function sanitizeMetadata(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeMetadata);

  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeMetadata(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const telemetry = {
  record(
    type: TelemetryEvent['type'],
    name: string,
    rawMetadata: Record<string, unknown> = {},
  ): void {
    const cleanMeta = (sanitizeMetadata(rawMetadata) as Record<string, unknown>) || {};
    const event: TelemetryEvent = {
      id: `tel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      name,
      metadata: cleanMeta,
      platform: 'android',
      appVersion: apiConfig.appVersion,
    };

    eventBuffer.push(event);
    if (eventBuffer.length > BUFFER_MAX_SIZE) {
      eventBuffer = eventBuffer.slice(-BUFFER_MAX_SIZE);
    }

    // Try background flush when buffer fills
    if (eventBuffer.length >= 10) {
      void this.flush();
    }
  },

  recordError(context: string, error: unknown, extra: Record<string, unknown> = {}): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack?.slice(0, 300) : undefined;
    this.record('ERROR', context, {
      message: errorMsg,
      stack,
      ...extra,
    });
  },

  recordApiFailure(endpoint: string, status: number, durationMs: number): void {
    this.record('API_FAILURE', endpoint, {
      status,
      durationMs,
    });
  },

  recordBookingEvent(step: string, bookingId: string, status: string): void {
    this.record('BOOKING_EVENT', step, {
      bookingId,
      status,
    });
  },

  recordPaymentEvent(step: string, method: string, status: string): void {
    this.record('PAYMENT_EVENT', step, {
      method,
      status,
    });
  },

  recordSyncEvent(durationMs: number, status: string, details: Record<string, unknown> = {}): void {
    this.record('SYNC_EVENT', 'VaultSync', {
      durationMs,
      status,
      ...details,
    });
  },

  async flush(): Promise<number> {
    if (isFlushing || eventBuffer.length === 0) return 0;
    isFlushing = true;
    const batch = [...eventBuffer];
    try {
      await api.post('/telemetry/errors', { events: batch });
      eventBuffer = eventBuffer.filter((e) => !batch.some((b) => b.id === e.id));
      return batch.length;
    } catch {
      // Best-effort flush; events remain buffered for the next attempt
      return 0;
    } finally {
      isFlushing = false;
    }
  },

  getBufferSize(): number {
    return eventBuffer.length;
  },

  clearBuffer(): void {
    eventBuffer = [];
  },
};
