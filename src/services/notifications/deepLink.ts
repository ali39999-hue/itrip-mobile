import { z } from 'zod';
import type { NotificationPayload } from './payload';

/**
 * Notification deep-link actions & deduplication (R8).
 *
 * Exit gate R8: "every notification ends in a valid deep link and no
 * duplicate events." This module is the single source of truth for the
 * route each payload type opens, plus a pure dedupe filter so a server
 * retry or a foreground+background double-delivery never fires twice.
 */

export const DeepLinkSchema = z
  .string()
  .regex(/^(itrip|com\.firuzo\.itrip|exp\+itrip-mobile):\/\//, 'must be an app deep link');
export type DeepLink = z.infer<typeof DeepLinkSchema>;

/** Maps a typed payload to its canonical deep-link route. */
export function deepLinkFor(payload: NotificationPayload): DeepLink {
  switch (payload.type) {
    case 'FLIGHT_DELAY':
    case 'GATE_CHANGE':
      // Land on the vault entry the alert concerns.
      return `itrip://trip/${encodeURIComponent(payload.bookingRef)}`;
    case 'CHECKIN_REMINDER':
      return `itrip://trip/${encodeURIComponent(payload.bookingRef)}`;
    case 'BOOKING_CONFIRMED':
      // Fresh confirmation → confirmation view with the ref.
      return `itrip://booking/${encodeURIComponent(payload.bookingRef)}`;
  }
}

/** Human-visible dedupe key: same alert for the same ref is one event. */
export function dedupeKey(payload: NotificationPayload): string {
  switch (payload.type) {
    case 'FLIGHT_DELAY':
      // Same flight, same new departure time ⇒ same delay event.
      return `FLIGHT_DELAY:${payload.bookingRef}:${payload.newDepartureTime}`;
    case 'GATE_CHANGE':
      return `GATE_CHANGE:${payload.bookingRef}:${payload.newGate}`;
    case 'CHECKIN_REMINDER':
      return `CHECKIN_REMINDER:${payload.bookingRef}:${payload.checkIn}`;
    case 'BOOKING_CONFIRMED':
      return `BOOKING_CONFIRMED:${payload.bookingRef}`;
  }
}

/**
 * Bounded LRU dedupe filter. Returns true if this key was NOT seen
 * before (deliver it), false if it is a duplicate (drop it).
 */
export class NotificationDeduplicator {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly capacity = 128) {}

  shouldDeliver(payload: NotificationPayload): boolean {
    const key = dedupeKey(payload);
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    this.order.push(key);
    while (this.order.length > this.capacity) {
      const oldest = this.order.shift();
      if (oldest) this.seen.delete(oldest);
    }
    return true;
  }

  get size(): number {
    return this.seen.size;
  }

  clear(): void {
    this.seen.clear();
    this.order.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Trip reminder engine (pure scheduling policy, R8)
// ---------------------------------------------------------------------------

export interface ReminderPlan {
  /** Fire-at ISO instants for the local scheduler (workmanager/notifee). */
  fireAt: string[];
  kind: 'CHECKIN_REMINDER' | 'DEPARTURE_REMINDER';
  bookingRef: string;
}

/**
 * Builds the reminder schedule for an upcoming itinerary item:
 * 24h before and 2h before the event, dropping instants in the past.
 * Pure — the caller decides how to persist (expo-notifications ids).
 */
export function planReminders(params: {
  kind: 'CHECKIN_REMINDER' | 'DEPARTURE_REMINDER';
  bookingRef: string;
  eventAt: string; // ISO
  now?: Date;
}): ReminderPlan {
  const now = params.now ?? new Date();
  const event = new Date(params.eventAt).getTime();
  const offsets = [24 * 3600_000, 2 * 3600_000];
  const fireAt = offsets
    .map((off) => new Date(event - off))
    .filter((d) => d.getTime() > now.getTime())
    .map((d) => d.toISOString());
  return { kind: params.kind, bookingRef: params.bookingRef, fireAt };
}
