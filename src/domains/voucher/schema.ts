import { z } from 'zod';
import type { Voucher } from './voucher';

/**
 * Voucher payload schema — the pure-Zod contract an external (server) payload
 * must satisfy before it is allowed into the offline vault.
 *
 * The vault is rendered with zero network access, so every field the trip
 * screens read must be present; a payload that fails this schema must never
 * overwrite a locally stored voucher (an incomplete row would break the
 * whole vault load on boot).
 *
 * Mirrors the FlightVoucher / HotelVoucher / TourVoucher / TransferVoucher
 * interfaces in ./voucher.ts 1:1. Pure domain: zod only — no react/expo.
 */

const dateTime = z.string().min(1);
const money = z.object({
  // Exact decimal string — floats are never allowed for amounts (§5.3).
  amount: z.string().regex(/^-?\d+(\.\d+)?$/),
  currency: z.string().length(3),
});

const flightPassenger = z.object({
  firstNameLatin: z.string().min(1),
  lastNameLatin: z.string().min(1),
  passportNumber: z.string().min(1),
  type: z.string().min(1),
});

export const FlightVoucherSchema = z
  .object({
    kind: z.literal('flight'),
    bookingRef: z.string().min(1),
    createdAt: dateTime,
    airline: z.string().min(1),
    airlineCode: z.string().min(1),
    flightNumber: z.string().min(1),
    origin: z.string().min(1),
    originCity: z.string().min(1),
    destination: z.string().min(1),
    destinationCity: z.string().min(1),
    departureTime: dateTime,
    arrivalTime: dateTime,
    durationMinutes: z.number().nonnegative(),
    cabinClass: z.string().min(1),
    seat: z.string().min(1).optional(),
    terminal: z.string().min(1).optional(),
    passengers: z.array(flightPassenger),
    total: money,
  })
  .passthrough();

export const HotelVoucherSchema = z
  .object({
    kind: z.literal('hotel'),
    bookingRef: z.string().min(1),
    createdAt: dateTime,
    hotelName: z.string().min(1),
    hotelNameFa: z.string().min(1),
    addressFa: z.string().min(1),
    phone: z.string().min(1),
    checkIn: dateTime,
    checkOut: dateTime,
    nights: z.number().int().positive(),
    roomType: z.string().min(1),
    guests: z.number().int().positive(),
    total: money,
  })
  .passthrough();

export const TourVoucherSchema = z
  .object({
    kind: z.literal('tour'),
    bookingRef: z.string().min(1),
    createdAt: dateTime,
    tourTitle: z.string().min(1),
    tourTitleFa: z.string().min(1),
    city: z.string().min(1),
    departureDate: dateTime,
    durationDays: z.number().int().positive(),
    executionModel: z.string().min(1),
    hotelTier: z.string().min(1),
    travelers: z.number().int().positive(),
    leadPassengerName: z.string().min(1),
    total: money,
  })
  .passthrough();

export const TransferVoucherSchema = z
  .object({
    kind: z.literal('transfer'),
    bookingRef: z.string().min(1),
    createdAt: dateTime,
    carTitle: z.string().min(1),
    pickupLocation: z.string().min(1),
    dropoffLocation: z.string().min(1),
    pickupDateTime: dateTime,
    withDriver: z.boolean(),
    passengerName: z.string().min(1),
    passengerPhone: z.string().min(1),
    total: money,
  })
  .passthrough();

export const VoucherSchema = z.discriminatedUnion('kind', [
  FlightVoucherSchema,
  HotelVoucherSchema,
  TourVoucherSchema,
  TransferVoucherSchema,
]);

/**
 * Validates a raw payload against the voucher contract.
 * Returns the parsed voucher on success, or null when the payload is
 * incomplete/malformed — callers must treat null as "keep the local row".
 */
export function parseVoucher(input: unknown): Voucher | null {
  const result = VoucherSchema.safeParse(input);
  return result.success ? (result.data as Voucher) : null;
}
