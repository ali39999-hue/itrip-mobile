import { describe, it, expect } from 'vitest';
import { deriveTrips, findActiveTrip } from './trip';
import type { FlightVoucher, HotelVoucher, TransferVoucher } from '@/domains/voucher/voucher';

const flight: FlightVoucher = {
  kind: 'flight',
  bookingRef: 'ITR-F1',
  createdAt: '2026-09-01T00:00:00Z',
  airline: 'Mahan',
  airlineCode: 'W5',
  flightNumber: 'W5104',
  origin: 'IKA',
  originCity: 'Tehran',
  destination: 'SYZ',
  destinationCity: 'Shiraz',
  departureTime: '2026-10-12T05:00:00Z',
  arrivalTime: '2026-10-12T06:20:00Z',
  durationMinutes: 80,
  cabinClass: 'ECONOMY',
  passengers: [],
  total: { amount: '45', currency: 'USD' },
};

const hotel: HotelVoucher = {
  kind: 'hotel',
  bookingRef: 'ITR-H1',
  createdAt: '2026-09-01T00:00:00Z',
  hotelName: 'Shiraz Grand',
  hotelNameFa: 'هتل بزرگ شیراز',
  addressFa: 'شیراز',
  phone: '071',
  checkIn: '2026-10-12T14:00:00Z',
  checkOut: '2026-10-15T12:00:00Z',
  nights: 3,
  roomType: 'Deluxe',
  guests: 2,
  total: { amount: '120', currency: 'USD' },
};

const transfer: TransferVoucher = {
  kind: 'transfer',
  bookingRef: 'ITR-TR1',
  createdAt: '2026-09-01T00:00:00Z',
  carTitle: 'Sonata',
  pickupLocation: 'SYZ Airport',
  dropoffLocation: 'Shiraz Grand',
  pickupDateTime: '2026-10-12T06:45:00Z',
  withDriver: true,
  passengerName: 'Ali',
  passengerPhone: '0912',
  total: { amount: '25', currency: 'IRR' },
};

/** A second journey two weeks later. */
const flight2: FlightVoucher = {
  ...flight,
  bookingRef: 'ITR-F2',
  departureTime: '2026-10-26T05:00:00Z',
  arrivalTime: '2026-10-26T06:20:00Z',
};

describe('Trip derivation (R5 Travel Vault)', () => {
  it('groups flight + hotel + transfer within the 2-day window into ONE trip', () => {
    const trips = deriveTrips([flight, hotel, transfer]);
    expect(trips).toHaveLength(1);
    expect(trips[0]!.bookingRefs).toEqual(['ITR-F1', 'ITR-TR1', 'ITR-H1']); // chronological
    expect(trips[0]!.startsAt).toBe('2026-10-12T05:00:00Z');
    expect(trips[0]!.endsAt).toBe('2026-10-15T12:00:00.000Z'); // hotel checkout
  });

  it('splits vouchers two weeks apart into separate trips', () => {
    const trips = deriveTrips([flight, flight2]);
    expect(trips).toHaveLength(2);
    expect(trips[0]!.bookingRefs).toEqual(['ITR-F1']);
    expect(trips[1]!.bookingRefs).toEqual(['ITR-F2']);
  });

  it('produces a deterministic ordering of timeline entries', () => {
    const trips = deriveTrips([hotel, transfer, flight]);
    const legs = trips[0]!.entries.map((e) => e.legKind);
    expect(legs).toEqual(['flight', 'transfer', 'hotel']);
  });

  it('a lone voucher is still a valid single-entry trip', () => {
    const trips = deriveTrips([flight]);
    expect(trips).toHaveLength(1);
    expect(trips[0]!.entries).toHaveLength(1);
  });

  it('input is not mutated', () => {
    const input = [hotel, flight];
    const snapshot = JSON.stringify(input);
    deriveTrips(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe('Active trip finder (R5 in-trip mode)', () => {
  const trips = deriveTrips([flight, hotel, transfer, flight2]);

  it('returns the in-progress trip when now is inside its window', () => {
    const mid = new Date('2026-10-13T10:00:00Z');
    const active = findActiveTrip(trips, mid);
    expect(active?.bookingRefs).toContain('ITR-H1');
  });

  it('returns the next upcoming trip when none is in progress', () => {
    const before = new Date('2026-10-01T00:00:00Z');
    expect(findActiveTrip(trips, before)?.bookingRefs).toContain('ITR-F1');
    const between = new Date('2026-10-20T00:00:00Z');
    expect(findActiveTrip(trips, between)?.bookingRefs).toContain('ITR-F2');
  });

  it('returns null when no trips exist or all are past', () => {
    expect(findActiveTrip([], new Date('2026-10-13T00:00:00Z'))).toBeNull();
    const pastOnly = deriveTrips([flight]);
    expect(findActiveTrip(pastOnly, new Date('2026-11-30T00:00:00Z'))).toBeNull();
  });
});
