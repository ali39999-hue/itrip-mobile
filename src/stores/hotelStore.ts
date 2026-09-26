import { create } from 'zustand';
import type { RoomOffer, SearchHotelsParams } from '@/services/api';
import {
  BookingStatus,
  canTransition,
  type BookingStatus as Status,
} from '@/domains/booking/state';
import { priceStay, type FareBreakdown } from '@/domains/booking/pricing';
import { money, type Money } from '@/domains/currency/money';
import { validateStay } from '@/domains/hotel/stay';

/**
 * Hotel booking store — one draft hotel reservation at a time.
 *
 * Same lifecycle guarantees as the flight funnel: FSM-guarded transitions,
 * server as Source of Truth, Zod-validated inputs.
 */

export interface HotelDraft {
  search: SearchHotelsParams | null;
  offer: RoomOffer | null;
  guests: number;
  rooms: number;
  status: Status;
  breakdown: FareBreakdown | null;
  serverQuoteRef: string | null;
}

interface HotelState {
  draft: HotelDraft;
  setSearch: (search: SearchHotelsParams) => void;
  selectOffer: (offer: RoomOffer, guests: number, rooms: number) => void;
  /** Adds guest names (hotel check-in doesn't need passports). */
  setGuestNames: (names: string[]) => void;
  guestNames: string[];
  markCheckoutInitiated: (quoteRef: string) => void;
  confirm: () => void;
  cancel: () => void;
  reset: () => void;
  draftTotal: () => Money | null;
  nights: () => number;
}

const emptyDraft: HotelDraft = {
  search: null,
  offer: null,
  guests: 2,
  rooms: 1,
  status: 'PENDING_PAYMENT',
  breakdown: null,
  serverQuoteRef: null,
};

export const useHotelStore = create<HotelState>((set, get) => ({
  draft: emptyDraft,
  guestNames: [],

  setSearch: (search) => set((s) => ({ draft: { ...s.draft, search } })),

  selectOffer: (offer, guests, rooms) => {
    const s = get().draft.search;
    if (!s) throw new Error('No hotel search set');
    const nights = validateStay(s.checkIn, s.checkOut);
    const nightly = money(offer.nightlyRate, offer.currency);
    const breakdown = priceStay(nightly, nights, rooms);
    set({
      draft: {
        ...get().draft,
        offer,
        guests,
        rooms,
        breakdown,
        status: 'PENDING_PAYMENT',
        serverQuoteRef: null,
      },
    });
  },

  setGuestNames: (names) => set({ guestNames: names }),

  markCheckoutInitiated: (quoteRef) =>
    set((s) => ({ draft: { ...s.draft, serverQuoteRef: quoteRef } })),

  confirm: () => {
    const { draft } = get();
    if (!canTransition(draft.status, BookingStatus.CONFIRMED)) {
      throw new Error(`Invalid transition ${draft.status} → CONFIRMED`);
    }
    set({ draft: { ...draft, status: 'CONFIRMED' } });
  },

  cancel: () => {
    const { draft } = get();
    if (!canTransition(draft.status, BookingStatus.CANCELLED)) {
      throw new Error(`Invalid transition ${draft.status} → CANCELLED`);
    }
    set({ draft: { ...draft, status: 'CANCELLED' } });
  },

  reset: () => set({ draft: emptyDraft, guestNames: [] }),

  draftTotal: () => get().draft.breakdown?.total ?? null,

  nights: () => {
    const s = get().draft.search;
    if (!s) return 0;
    try {
      return validateStay(s.checkIn, s.checkOut);
    } catch {
      return 0;
    }
  },
}));
