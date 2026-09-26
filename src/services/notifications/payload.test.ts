import { describe, it, expect } from 'vitest';
import { NotificationPayloadSchema, parseNotificationPayload } from './payload';

/**
 * Push payload contract tests.
 *
 * These run without the native module: only the Zod schema and the parser
 * are exercised, so a malformed server payload can never crash the app.
 */
describe('notification payload contract', () => {
  it('accepts a flight delay payload', () => {
    const result = NotificationPayloadSchema.safeParse({
      type: 'FLIGHT_DELAY',
      bookingRef: 'ITR-1',
      flightNumber: 'W5104',
      delayMinutes: 45,
      newDepartureTime: '2026-10-12T07:05:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a gate change payload', () => {
    const result = NotificationPayloadSchema.safeParse({
      type: 'GATE_CHANGE',
      bookingRef: 'ITR-1',
      flightNumber: 'W5104',
      newGate: 'B12',
      terminal: '4',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a booking confirmed payload', () => {
    const result = NotificationPayloadSchema.safeParse({
      type: 'BOOKING_CONFIRMED',
      bookingRef: 'ITR-9',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown notification type', () => {
    const result = NotificationPayloadSchema.safeParse({ type: 'MARKETING', bookingRef: 'X' });
    expect(result.success).toBe(false);
  });

  it('rejects a delay payload missing required fields', () => {
    const result = NotificationPayloadSchema.safeParse({
      type: 'FLIGHT_DELAY',
      bookingRef: 'ITR-1',
    });
    expect(result.success).toBe(false);
  });

  it('parseNotificationPayload returns null instead of throwing', () => {
    expect(parseNotificationPayload(null)).toBeNull();
    expect(parseNotificationPayload('nonsense')).toBeNull();
    expect(parseNotificationPayload({ type: 'FLIGHT_DELAY' })).toBeNull();
  });

  it('parseNotificationPayload returns the typed payload on success', () => {
    const payload = parseNotificationPayload({
      type: 'GATE_CHANGE',
      bookingRef: 'ITR-2',
      flightNumber: 'IR720',
      newGate: 'A3',
    });
    expect(payload).not.toBeNull();
    expect(payload?.type).toBe('GATE_CHANGE');
  });
});
