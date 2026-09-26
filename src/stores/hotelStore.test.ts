import { describe, it, expect, beforeEach } from 'vitest';
import { useHotelStore } from './hotelStore';
import type { RoomOffer } from '@/services/api';

const offer: RoomOffer = {
  id: 'room-1',
  hotel: {
    id: 'h1',
    name: 'Shiraz Grand Hotel',
    nameFa: 'هتل بزرگ شیراز',
    addressFa: 'شیراز، دروازه قرآن',
    city: 'Shiraz',
    phone: '071-32274820',
    stars: 5,
  },
  roomType: 'Deluxe Suite',
  board: 'BB',
  freeCancellation: true,
  maxGuests: 3,
  nightlyRate: '50.00',
  currency: 'USD',
};

describe('hotelStore', () => {
  beforeEach(() => {
    useHotelStore.getState().reset();
  });

  it('prices a stay from nightly rate × nights × rooms', () => {
    const s = useHotelStore.getState();
    s.setSearch({ city: 'Shiraz', checkIn: '2026-11-12', checkOut: '2026-11-15', guests: 2, rooms: 1 });
    s.selectOffer(offer, 2, 1);

    const draft = useHotelStore.getState().draft;
    expect(draft.breakdown?.base.amount.toFixed(2)).toBe('150.00'); // 3 nights × 50
    expect(draft.status).toBe('PENDING_PAYMENT');
  });

  it('reports the derived night count', () => {
    const s = useHotelStore.getState();
    s.setSearch({ city: 'Shiraz', checkIn: '2026-11-12', checkOut: '2026-11-15', guests: 2, rooms: 1 });
    expect(useHotelStore.getState().nights()).toBe(3);
  });

  it('accounts for multiple rooms', () => {
    const s = useHotelStore.getState();
    s.setSearch({ city: 'Shiraz', checkIn: '2026-11-12', checkOut: '2026-11-14', guests: 4, rooms: 2 });
    s.selectOffer(offer, 4, 2);
    const draft = useHotelStore.getState().draft;
    expect(draft.breakdown?.base.amount.toFixed(2)).toBe('200.00'); // 2 nights × 2 rooms × 50
  });

  it('refuses to select an offer before a search is set', () => {
    expect(() => useHotelStore.getState().selectOffer(offer, 2, 1)).toThrow();
  });

  it('confirms a pending booking and rejects a second confirm', () => {
    const s = useHotelStore.getState();
    s.setSearch({ city: 'Shiraz', checkIn: '2026-11-12', checkOut: '2026-11-15', guests: 2, rooms: 1 });
    s.selectOffer(offer, 2, 1);
    s.confirm();
    expect(useHotelStore.getState().draft.status).toBe('CONFIRMED');
    expect(() => useHotelStore.getState().confirm()).toThrow();
  });

  it('refuses to cancel an already-cancelled booking', () => {
    const s = useHotelStore.getState();
    s.setSearch({ city: 'Shiraz', checkIn: '2026-11-12', checkOut: '2026-11-15', guests: 2, rooms: 1 });
    s.selectOffer(offer, 2, 1);
    s.cancel();
    expect(useHotelStore.getState().draft.status).toBe('CANCELLED');
    expect(() => useHotelStore.getState().cancel()).toThrow();
  });

  it('stores and clears the lead guest name', () => {
    const s = useHotelStore.getState();
    s.setGuestNames(['Ali Rezaei']);
    expect(useHotelStore.getState().guestNames).toEqual(['Ali Rezaei']);
    useHotelStore.getState().reset();
    expect(useHotelStore.getState().guestNames).toEqual([]);
  });

  it('reset clears the whole draft', () => {
    const s = useHotelStore.getState();
    s.setSearch({ city: 'Shiraz', checkIn: '2026-11-12', checkOut: '2026-11-15', guests: 2, rooms: 1 });
    s.selectOffer(offer, 2, 1);
    useHotelStore.getState().reset();
    const draft = useHotelStore.getState().draft;
    expect(draft.offer).toBeNull();
    expect(draft.search).toBeNull();
    expect(draft.breakdown).toBeNull();
  });
});
