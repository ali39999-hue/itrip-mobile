import { describe, it, expect } from 'vitest';
import {
  deepLinkFor,
  dedupeKey,
  NotificationDeduplicator,
  planReminders,
} from './deepLink';
import { parseNotificationPayload } from './payload';

const delayPayload = parseNotificationPayload({
  type: 'FLIGHT_DELAY',
  bookingRef: 'ITR-99824',
  flightNumber: 'W5104',
  delayMinutes: 40,
  newDepartureTime: '2026-10-12T05:40:00Z',
})!;

const gatePayload = parseNotificationPayload({
  type: 'GATE_CHANGE',
  bookingRef: 'ITR-99824',
  flightNumber: 'W5104',
  newGate: 'C4',
})!;

describe('Notification deep links & dedupe (R8 exit gate)', () => {
  it('every payload type resolves to a valid app deep link', () => {
    expect(deepLinkFor(delayPayload)).toBe('itrip://trip/ITR-99824');
    expect(deepLinkFor(gatePayload)).toBe('itrip://trip/ITR-99824');
    const confirmed = parseNotificationPayload({ type: 'BOOKING_CONFIRMED', bookingRef: 'ITR-1' })!;
    expect(deepLinkFor(confirmed)).toBe('itrip://booking/ITR-1');
  });

  it('same alert delivered twice (retry / dual-channel) dedupes to one event', () => {
    const d = new NotificationDeduplicator();
    expect(d.shouldDeliver(delayPayload)).toBe(true);
    expect(d.shouldDeliver(delayPayload)).toBe(false); // exact duplicate
    // Same flight delayed again to a NEW time is a NEW event
    const again = parseNotificationPayload({
      ...delayPayload,
      newDepartureTime: '2026-10-12T06:10:00Z',
    })!;
    expect(d.shouldDeliver(again)).toBe(true);
  });

  it('gate change to a different gate is a distinct event', () => {
    const d = new NotificationDeduplicator();
    expect(d.shouldDeliver(gatePayload)).toBe(true);
    const moved = parseNotificationPayload({ ...gatePayload, newGate: 'D7' })!;
    expect(d.shouldDeliver(moved)).toBe(true);
  });

  it('dedupe key is stable per type+ref+modifier', () => {
    expect(dedupeKey(gatePayload)).toBe('GATE_CHANGE:ITR-99824:C4');
    expect(dedupeKey(delayPayload)).toBe('FLIGHT_DELAY:ITR-99824:2026-10-12T05:40:00Z');
  });

  it('LRU capacity evicts oldest keys', () => {
    const d = new NotificationDeduplicator(2);
    const p1 = parseNotificationPayload({ type: 'BOOKING_CONFIRMED', bookingRef: 'A' })!;
    const p2 = parseNotificationPayload({ type: 'BOOKING_CONFIRMED', bookingRef: 'B' })!;
    const p3 = parseNotificationPayload({ type: 'BOOKING_CONFIRMED', bookingRef: 'C' })!;
    d.shouldDeliver(p1);
    d.shouldDeliver(p2);
    d.shouldDeliver(p3); // evicts A
    expect(d.size).toBe(2);
    expect(d.shouldDeliver(p1)).toBe(true); // A deliverable again after eviction
  });
});

describe('Trip reminder engine (R8)', () => {
  it('schedules 24h and 2h reminders for a future event', () => {
    const plan = planReminders({
      kind: 'CHECKIN_REMINDER',
      bookingRef: 'ITR-H1',
      eventAt: '2026-10-12T14:00:00Z',
      now: new Date('2026-10-01T00:00:00Z'),
    });
    expect(plan.fireAt).toEqual(['2026-10-11T14:00:00.000Z', '2026-10-12T12:00:00.000Z']);
  });

  it('drops reminders already in the past', () => {
    const plan = planReminders({
      kind: 'DEPARTURE_REMINDER',
      bookingRef: 'ITR-F1',
      eventAt: '2026-10-12T05:00:00Z',
      now: new Date('2026-10-11T20:00:00Z'), // 24h past, 2h still future
    });
    expect(plan.fireAt).toHaveLength(1);
    expect(plan.fireAt[0]).toBe('2026-10-12T03:00:00.000Z');
  });

  it('returns an empty schedule for imminent events', () => {
    const plan = planReminders({
      kind: 'CHECKIN_REMINDER',
      bookingRef: 'ITR-H2',
      eventAt: '2026-10-12T14:00:00Z',
      now: new Date('2026-10-12T13:30:00Z'), // < 2h away
    });
    expect(plan.fireAt).toEqual([]);
  });
});
