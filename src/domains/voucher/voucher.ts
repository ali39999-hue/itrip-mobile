/**
 * Voucher domain — the offline "digital pass" payload for confirmed bookings.
 *
 * Invariants:
 * - A voucher is created only from a CONFIRMED booking (FSM guard upstream).
 * - The barcode payload is a deterministic, URL-safe string (IATA BCBP-like
 *   segment format: "M" leg marker, airline+flight, date, airports, PNR).
 * - Everything is plain strings/numbers so it can be persisted to SQLite
 *   and re-rendered with zero network access.
 */

import type { FlightOffer, SearchFlightsParams } from '@/domains/booking/offerTypes';
import type { Passenger } from '@/domains/identity/passenger';
import { money, type Money } from '@/domains/currency/money';

export type VoucherKind = 'flight' | 'hotel' | 'tour' | 'transfer';

export interface FlightVoucher {
  kind: 'flight';
  /** Booking reference (PNR), e.g. ITR-99824. Always LTR-safe. */
  bookingRef: string;
  createdAt: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  /** ISO datetime */
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  cabinClass: string;
  seat?: string;
  terminal?: string;
  passengers: Array<{
    firstNameLatin: string;
    lastNameLatin: string;
    passportNumber: string;
    type: string;
  }>;
  total: { amount: string; currency: string };
}

export interface HotelVoucher {
  kind: 'hotel';
  bookingRef: string;
  createdAt: string;
  hotelName: string;
  hotelNameFa: string;
  /** Full Persian address shown to taxi drivers. */
  addressFa: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType: string;
  guests: number;
  total: { amount: string; currency: string };
}

export interface TourVoucher {
  kind: 'tour';
  bookingRef: string;
  createdAt: string;
  tourTitle: string;
  tourTitleFa: string;
  city: string;
  departureDate: string;
  durationDays: number;
  executionModel: string;
  hotelTier: string;
  travelers: number;
  leadPassengerName: string;
  total: { amount: string; currency: string };
}

export interface TransferVoucher {
  kind: 'transfer';
  bookingRef: string;
  createdAt: string;
  carTitle: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  withDriver: boolean;
  passengerName: string;
  passengerPhone: string;
  total: { amount: string; currency: string };
}

export type Voucher = FlightVoucher | HotelVoucher | TourVoucher | TransferVoucher;

/** Builds a BCBP-style barcode payload: M1SURNAME/GIVENNAME ECODE Y 14A. */
export function buildFlightBarcodePayload(
  voucher: FlightVoucher,
  passenger: FlightVoucher['passengers'][number],
): string {
  const yymmdd = voucher.departureTime.slice(2, 4) + voucher.departureTime.slice(5, 7) + voucher.departureTime.slice(8, 10);
  const name = `M1${passenger.lastNameLatin.toUpperCase()}/${passenger.firstNameLatin.toUpperCase()}`.padEnd(20, ' ');
  const code =
    voucher.airlineCode + voucher.flightNumber.replace(/^[A-Z0-9]{2,3}/, '').padStart(4, '0');
  return [
    name,
    voucher.bookingRef,
    voucher.origin + voucher.destination,
    code,
    yymmdd,
    voucher.cabinClass.slice(0, 1),
    passenger.type === 'INFANT' ? 'I' : 'A',
  ].join(' ');
}

/** Unique payload for hotel vouchers (scannable by hotel reception). */
export function buildHotelBarcodePayload(voucher: HotelVoucher): string {
  return `ITR:HOTEL:${voucher.bookingRef}:${voucher.checkIn.slice(0, 10)}`;
}

/** Unique payload for tour vouchers (scannable by tour guide). */
export function buildTourBarcodePayload(voucher: TourVoucher): string {
  return `ITR:TOUR:${voucher.bookingRef}:${voucher.departureDate}`;
}

/** Unique payload for transfer vouchers (scannable by driver). */
export function buildTransferBarcodePayload(voucher: TransferVoucher): string {
  return `ITR:TRANSFER:${voucher.bookingRef}`;
}

/** Converts a confirmed booking funnel state into a persisted voucher. */
export function flightVoucherFromDraft(params: {
  bookingRef: string;
  offer: FlightOffer;
  search: SearchFlightsParams;
  passengers: Passenger[];
  total: Money;
}): FlightVoucher {
  const seg = params.offer.segments[0];
  if (!seg) throw new Error('Offer has no segments');
  const d = seg.departureTime;
  const a = seg.arrivalTime;
  return {
    kind: 'flight',
    bookingRef: params.bookingRef,
    createdAt: new Date().toISOString(),
    airline: seg.airlineCode,
    airlineCode: seg.airlineCode,
    flightNumber: seg.flightNumber,
    origin: params.search.origin,
    originCity: params.search.origin,
    destination: params.search.destination,
    destinationCity: params.search.destination,
    departureTime: d,
    arrivalTime: a,
    durationMinutes: seg.durationMinutes,
    cabinClass: seg.cabinClass,
    passengers: params.passengers.map((p) => ({
      firstNameLatin: p.firstNameLatin,
      lastNameLatin: p.lastNameLatin,
      passportNumber: p.passport.number,
      type: p.type,
    })),
    total: { amount: params.total.amount.toFixed(2), currency: params.total.currency },
  };
}

/** Wallet-safe total access for display. */
export function voucherTotal(v: Voucher): Money {
  return money(v.total.amount, v.total.currency as Parameters<typeof money>[1]);
}

export function getVoucherScheduleTime(v: Voucher): string {
  switch (v.kind) {
    case 'flight':
      return v.departureTime;
    case 'hotel':
      return v.checkIn;
    case 'tour':
      return v.departureDate;
    case 'transfer':
      return v.pickupDateTime;
  }
}

/** Sorts upcoming (departure >= now) first, then by departure time. */
export function sortVouchers(vouchers: Voucher[]): Voucher[] {
  return [...vouchers].sort((a, b) => {
    const at = getVoucherScheduleTime(a);
    const bt = getVoucherScheduleTime(b);
    return at.localeCompare(bt);
  });
}
