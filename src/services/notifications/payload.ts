import { z } from 'zod';

/**
 * Push payload contract — pure schema, no native imports.
 *
 * Kept separate from ./index so it can be unit-tested (and reused by the
 * server contract package) without pulling in expo-notifications.
 */

export const NotificationPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('FLIGHT_DELAY'),
    bookingRef: z.string().min(1),
    flightNumber: z.string().min(1),
    delayMinutes: z.number().int(),
    newDepartureTime: z.string(),
  }),
  z.object({
    type: z.literal('GATE_CHANGE'),
    bookingRef: z.string().min(1),
    flightNumber: z.string().min(1),
    newGate: z.string().min(1),
    terminal: z.string().optional(),
  }),
  z.object({
    type: z.literal('CHECKIN_REMINDER'),
    bookingRef: z.string().min(1),
    hotelName: z.string().min(1),
    checkIn: z.string(),
  }),
  z.object({
    type: z.literal('BOOKING_CONFIRMED'),
    bookingRef: z.string().min(1),
  }),
]);

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

/** Safely parses an unknown notification payload; null when malformed. */
export function parseNotificationPayload(data: unknown): NotificationPayload | null {
  const result = NotificationPayloadSchema.safeParse(data);
  return result.success ? result.data : null;
}
