import { create } from 'zustand';
import type { FlightOffer, SearchFlightsParams, Airport } from '@/services/api';
import { Passenger } from '@/domains/identity/passenger';
import {
  BookingStatus,
  canTransition,
  type BookingStatus as Status,
} from '@/domains/booking/state';
import {
  priceBooking,
  convertBreakdown,
  type FareBreakdown,
} from '@/domains/booking/pricing';
import { money, type Money } from '@/domains/currency/money';
import Decimal from 'decimal.js';

/**
 * Booking store — one draft booking at a time (funnel state).
 *
 * Invariants:
 * - Status transitions go through canTransition (mirrors server lifecycle).
 * - The price shown is recomputed by the pricing engine; the server
 *   re-quotes at checkout and is the Source of Truth.
 * - Passengers must pass PassengerSchema before checkout is allowed.
 */

export interface BookingDraft {
  search: SearchFlightsParams | null;
  offer: FlightOffer | null;
  passengers: Passenger[];
  status: Status;
  breakdown: FareBreakdown | null;
  /** Server re-quote reference once checkout has been initiated. */
  serverQuoteRef: string | null;
}

interface BookingState {
  draft: BookingDraft;
  /** Cached airports for quick origin/destination pickers. */
  airports: Airport[];
  setSearch: (search: SearchFlightsParams) => void;
  selectOffer: (offer: FlightOffer, pax: number) => void;
  addPassenger: (p: Passenger) => void;
  removePassenger: (id: string) => void;
  markCheckoutInitiated: (quoteRef: string) => void;
  confirm: () => void;
  cancel: () => void;
  reset: () => void;
  setAirports: (airports: Airport[]) => void;
  /** Total in offer currency as Money for the review screen. */
  draftTotal: () => Money | null;
  /** Total converted to the traveler's display currency. */
  draftTotalIn: (currency: 'IRR' | 'USD', rate: string) => Money | null;
}

const emptyDraft: BookingDraft = {
  search: null,
  offer: null,
  passengers: [],
  status: 'PENDING_PAYMENT',
  breakdown: null,
  serverQuoteRef: null,
};

export const useBookingStore = create<BookingState>((set, get) => ({
  draft: emptyDraft,
  airports: [],

  setSearch: (search) =>
    set((s) => ({ draft: { ...s.draft, search } })),

  selectOffer: (offer, pax) => {
    const perPax = money(offer.priceAmount, offer.priceCurrency);
    const breakdown = priceBooking(perPax, pax);
    set((s) => ({
      draft: {
        ...s.draft,
        offer,
        breakdown,
        status: 'PENDING_PAYMENT',
        serverQuoteRef: null,
      },
    }));
  },

  addPassenger: (p) =>
    set((s) => {
      if (s.draft.passengers.some((x) => x.id === p.id)) return s;
      return { draft: { ...s.draft, passengers: [...s.draft.passengers, p] } };
    }),

  removePassenger: (id) =>
    set((s) => ({
      draft: {
        ...s.draft,
        passengers: s.draft.passengers.filter((p) => p.id !== id),
      },
    })),

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

  reset: () => set({ draft: emptyDraft }),

  setAirports: (airports) => set({ airports }),

  draftTotal: () => get().draft.breakdown?.total ?? null,

  draftTotalIn: (currency, rate) => {
    const bd = get().draft.breakdown;
    if (!bd) return null;
    return convertBreakdown(bd, new Decimal(rate), currency).total;
  },
}));

export type { Passenger };
