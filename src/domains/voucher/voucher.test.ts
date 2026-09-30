import { describe, it, expect } from 'vitest';
import {
  buildFlightBarcodePayload,
  buildHotelBarcodePayload,
  buildTourBarcodePayload,
  buildTransferBarcodePayload,
  flightVoucherFromDraft,
  sortVouchers,
  voucherTotal,
  type FlightVoucher,
  type HotelVoucher,
  type TourVoucher,
  type TransferVoucher,
} from './voucher';
import { money } from '@/domains/currency/money';
import type { FlightOffer, SearchFlightsParams } from '@/services/api/flights';
import type { Passenger } from '@/domains/identity/passenger';

const offer: FlightOffer = {
  id: 'of-1',
  segments: [
    {
      airlineCode: 'W5',
      flightNumber: 'W5104',
      departureTime: '2026-10-12T05:00:00.000Z',
      arrivalTime: '2026-10-12T06:20:00.000Z',
      durationMinutes: 80,
      cabinClass: 'ECONOMY',
    },
  ],
  priceAmount: '45.00',
  priceCurrency: 'USD',
  refundable: false,
  baggageKg: 20,
};

const search: SearchFlightsParams = {
  origin: 'IKA',
  destination: 'SYZ',
  departDate: '2026-10-12',
  adults: 1,
  cabinClass: 'ECONOMY',
};

const passenger: Passenger = {
  firstNameLatin: 'Ali',
  lastNameLatin: 'Rezaei',
  dateOfBirth: '1990-01-01',
  gender: 'MALE',
  type: 'ADULT',
  passport: { number: 'X1234567', nationality: 'IR', expiryDate: '2030-01-01' },
};

describe('voucher domain', () => {
  it('builds a flight voucher from a confirmed draft', () => {
    const v = flightVoucherFromDraft({
      bookingRef: 'ITR-TEST1',
      offer,
      search,
      passengers: [passenger],
      total: money('45.00', 'USD'),
    });
    expect(v.kind).toBe('flight');
    expect(v.airlineCode).toBe('W5');
    expect(v.flightNumber).toBe('W5104');
    expect(v.origin).toBe('IKA');
    expect(v.destination).toBe('SYZ');
    expect(v.passengers).toHaveLength(1);
    expect(v.total).toEqual({ amount: '45.00', currency: 'USD' });
  });

  it('builds a BCBP-style barcode payload deterministically', () => {
    const v = flightVoucherFromDraft({
      bookingRef: 'ITR-TEST1',
      offer,
      search,
      passengers: [passenger],
      total: money('45.00', 'USD'),
    });
    const payload = buildFlightBarcodePayload(v, v.passengers[0]!);
    expect(payload).toContain('M1REZAEI/ALI');
    expect(payload).toContain('ITR-TEST1');
    expect(payload).toContain('IKASYZ');
    expect(payload).toContain('261012'); // yymmdd of departure
    expect(payload).toContain('E'); // Economy class marker
  });

  it('builds a hotel barcode payload with booking ref and check-in', () => {
    const hv: HotelVoucher = {
      kind: 'hotel',
      bookingRef: 'ITR-H1',
      createdAt: '2026-09-24T00:00:00Z',
      hotelName: 'Shiraz Grand',
      hotelNameFa: 'هتل بزرگ شیراز',
      addressFa: 'شیراز، دروازه قرآن',
      phone: '071-32274820',
      checkIn: '2026-10-12T14:00:00Z',
      checkOut: '2026-10-15T12:00:00Z',
      nights: 3,
      roomType: 'Deluxe Suite',
      guests: 2,
      total: { amount: '120.00', currency: 'USD' },
    };
    expect(buildHotelBarcodePayload(hv)).toBe('ITR:HOTEL:ITR-H1:2026-10-12');
  });

  it('sorts vouchers chronologically by departure/check-in', () => {
    const early: FlightVoucher = {
      kind: 'flight',
      bookingRef: 'A',
      createdAt: '2026-01-01T00:00:00Z',
      airline: 'Mahan',
      airlineCode: 'W5',
      flightNumber: '104',
      origin: 'IKA',
      originCity: 'Tehran',
      destination: 'SYZ',
      destinationCity: 'Shiraz',
      departureTime: '2026-10-01T05:00:00Z',
      arrivalTime: '2026-10-01T06:20:00Z',
      durationMinutes: 80,
      cabinClass: 'ECONOMY',
      passengers: [],
      total: { amount: '1', currency: 'USD' },
    };
    const late: HotelVoucher = {
      kind: 'hotel',
      bookingRef: 'B',
      createdAt: '2026-01-02T00:00:00Z',
      hotelName: 'X',
      hotelNameFa: 'ایکس',
      addressFa: 'تهران',
      phone: '021',
      checkIn: '2026-11-01T14:00:00Z',
      checkOut: '2026-11-05T12:00:00Z',
      nights: 4,
      roomType: 'Suite',
      guests: 1,
      total: { amount: '2', currency: 'USD' },
    };
    expect(sortVouchers([late, early]).map((v) => v.bookingRef)).toEqual(['A', 'B']);
  });

  it('builds tour and transfer barcode payloads', () => {
    const tv: TourVoucher = {
      kind: 'tour',
      bookingRef: 'ITR-T99',
      createdAt: '2026-09-30T00:00:00Z',
      tourTitle: 'Isfahan Cultural Heritage Tour',
      tourTitleFa: 'تور فرهنگی اصفهان',
      city: 'Isfahan',
      departureDate: '2026-10-10',
      durationDays: 3,
      executionModel: 'group',
      hotelTier: 'STD',
      travelers: 2,
      leadPassengerName: 'Ali Rezaei',
      total: { amount: '30000000', currency: 'IRR' },
    };
    expect(buildTourBarcodePayload(tv)).toBe('ITR:TOUR:ITR-T99:2026-10-10');

    const trv: TransferVoucher = {
      kind: 'transfer',
      bookingRef: 'ITR-TR55',
      createdAt: '2026-09-30T00:00:00Z',
      carTitle: 'Hyundai Tucson 2024',
      pickupLocation: 'IKA Airport',
      dropoffLocation: 'Espinas Palace Hotel',
      pickupDateTime: '2026-10-10T18:00:00Z',
      withDriver: true,
      passengerName: 'Ali Rezaei',
      passengerPhone: '09121111111',
      total: { amount: '25000000', currency: 'IRR' },
    };
    expect(buildTransferBarcodePayload(trv)).toBe('ITR:TRANSFER:ITR-TR55');
  });

  it('voucherTotal returns a Money object', () => {
    const v = flightVoucherFromDraft({
      bookingRef: 'ITR-T2',
      offer,
      search,
      passengers: [passenger],
      total: money('99.50', 'USD'),
    });
    const total = voucherTotal(v);
    expect(total.currency).toBe('USD');
    expect(total.amount.toFixed(2)).toBe('99.50');
  });
});
