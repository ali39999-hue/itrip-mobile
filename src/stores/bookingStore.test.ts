import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from './bookingStore';
import type { FlightOffer, SearchFlightsParams } from '@/services/api';
import { PassengerSchema } from '@/domains/identity/passenger';

const offer: FlightOffer = {
  id: 'offer-1',
  segments: [
    {
      airlineCode: 'W5',
      flightNumber: 'W51045',
      departureTime: '2026-11-01T08:30:00.000Z',
      arrivalTime: '2026-11-01T09:50:00.000Z',
      durationMinutes: 80,
      cabinClass: 'ECONOMY',
    },
  ],
  priceAmount: '45.50',
  priceCurrency: 'USD',
  refundable: false,
  baggageKg: 20,
};

const search: SearchFlightsParams = {
  origin: 'IKA',
  destination: 'SYZ',
  departDate: '2026-11-01',
  adults: 1,
  cabinClass: 'ECONOMY',
};

const pax = PassengerSchema.parse({
  firstNameLatin: 'Alex',
  lastNameLatin: 'Smith',
  dateOfBirth: '1990-05-15',
  gender: 'MALE',
  type: 'ADULT',
  passport: { number: 'N8829103', nationality: 'FR', expiryDate: '2028-10-20' },
});

describe('BookingStore — draft lifecycle', () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
  });

  it('prices the draft from the selected offer', () => {
    const s = useBookingStore.getState();
    s.setSearch(search);
    s.selectOffer(offer, 2);
    const draft = useBookingStore.getState().draft;
    expect(draft.breakdown?.base.amount.toFixed(2)).toBe('91.00');
    expect(draft.breakdown?.total.amount.toFixed(2)).toBe('103.74');
    expect(draft.status).toBe('PENDING_PAYMENT');
  });

  it('adds and dedupes passengers', () => {
    const s = useBookingStore.getState();
    s.selectOffer(offer, 1);
    s.addPassenger(pax);
    s.addPassenger(pax); // duplicate ignored
    expect(useBookingStore.getState().draft.passengers).toHaveLength(1);
  });

  it('confirms only from PENDING_PAYMENT (state-machine guard)', () => {
    const s = useBookingStore.getState();
    s.selectOffer(offer, 1);
    s.confirm();
    expect(useBookingStore.getState().draft.status).toBe('CONFIRMED');
    expect(() => useBookingStore.getState().confirm()).toThrow(/Invalid transition/);
  });

  it('cancels a confirmed draft once', () => {
    const s = useBookingStore.getState();
    s.selectOffer(offer, 1);
    s.confirm();
    s.cancel();
    expect(useBookingStore.getState().draft.status).toBe('CANCELLED');
    expect(() => useBookingStore.getState().cancel()).toThrow(/Invalid transition/);
  });

  it('exposes the draft total as Money', () => {
    const s = useBookingStore.getState();
    s.selectOffer(offer, 1);
    const total = useBookingStore.getState().draftTotal();
    expect(total?.currency).toBe('USD');
    expect(total?.amount.toFixed(2)).toBe('51.88');
  });

  it('converts the total to IRR', () => {
    const s = useBookingStore.getState();
    s.selectOffer(offer, 1);
    const total = useBookingStore.getState().draftTotalIn('IRR', '600000');
    expect(total?.currency).toBe('IRR');
    expect(total?.amount.toFixed(0)).toBe('31128000');
  });

  it('resets to an empty draft', () => {
    const s = useBookingStore.getState();
    s.selectOffer(offer, 1);
    s.reset();
    expect(useBookingStore.getState().draft.offer).toBeNull();
    expect(useBookingStore.getState().draft.passengers).toHaveLength(0);
  });
});
