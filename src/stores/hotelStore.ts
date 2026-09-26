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
import { bookingService } from '@/services/api';

/**
 * Hotel booking store — one draft hotel reservation at a time.
 *
 * Same lifecycle guarantees as the flight funnel: FSM-guarded transitions,
 * server as Source of Truth, Zod-validated inputs, and server-authoritative checkout.
 */

export interface HotelDraft {
  search: SearchHotelsParams | null;
  offer: RoomOffer | null;
  guests: number;
  rooms: number;
  status: Status;
  breakdown: FareBreakdown | null;
  serverQuoteRef: string | null;
  bookingId: string | null;
  serverReference: string | null;
  idempotencyKey: string | null;
}

interface HotelState {
  draft: HotelDraft;
  guestNames: string[];
  isSubmitting: boolean;
  lastError: string | null;
  setSearch: (search: SearchHotelsParams) => void;
  selectOffer: (offer: RoomOffer, guests: number, rooms: number) => void;
  setGuestNames: (names: string[]) => void;
  markCheckoutInitiated: (quoteRef: string) => void;
  /**
   * Authoritative server draft reservation for hotel allotment.
   */
  createAuthoritativeDraft: (contactPhone: string, contactEmail?: string) => Promise<{
    bookingId: string;
    reference: string;
  }>;
  /**
   * Authoritative server payment execution for hotel room.
   */
  confirmAuthoritativePayment: (
    method: 'wallet_irr' | 'gateway_shetab' | 'gateway_ecardo',
    options?: {
      targetCurrency?: string;
      paymentInstrument?: 'visa_mastercard' | 'crypto_usdt' | 'wechat_alipay' | 'shetab_card';
    }
  ) => Promise<{
    success: boolean;
    bookingStatus: string;
    redirectUrl?: string;
    error?: string;
  }>;
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
  bookingId: null,
  serverReference: null,
  idempotencyKey: null,
};

export const useHotelStore = create<HotelState>((set, get) => ({
  draft: emptyDraft,
  guestNames: [],
  isSubmitting: false,
  lastError: null,

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
        bookingId: null,
        serverReference: null,
        idempotencyKey: null,
      },
      lastError: null,
    });
  },

  setGuestNames: (names) => set({ guestNames: names }),

  markCheckoutInitiated: (quoteRef) =>
    set((s) => ({ draft: { ...s.draft, serverQuoteRef: quoteRef } })),

  createAuthoritativeDraft: async (contactPhone, contactEmail) => {
    const { draft, guestNames } = get();
    if (!draft.offer || !draft.search) {
      throw new Error('Incomplete hotel draft: offer and search parameters required');
    }

    set({ isSubmitting: true, lastError: null });
    try {
      const idempotencyKey = draft.idempotencyKey || `idem-hotel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const nights = get().nights();
      const itemTitle = `${draft.offer.hotel.name} (${draft.offer.roomType}, ${nights} nights)`;

      const passengers = guestNames.length > 0
        ? guestNames.map((name) => ({ firstName: name, lastName: '', type: 'ADULT' }))
        : Array.from({ length: draft.guests }).map((_, i) => ({ firstName: `Guest ${i + 1}`, lastName: '', type: 'ADULT' }));

      const res = await bookingService.createDraft({
        idempotencyKey,
        type: 'HOTEL',
        itemId: draft.offer.id,
        itemTitle,
        count: draft.rooms,
        nights,
        travelDate: draft.search.checkIn,
        passengers,
        contactPhone,
        contactEmail,
        source: 'MOBILE',
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to create hotel booking draft');
      }

      set((s) => ({
        isSubmitting: false,
        draft: {
          ...s.draft,
          bookingId: res.bookingId,
          serverReference: res.reference,
          idempotencyKey,
          status: 'PENDING_PAYMENT',
        },
      }));

      return { bookingId: res.bookingId, reference: res.reference };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hotel draft creation failed';
      set({ isSubmitting: false, lastError: message });
      throw err;
    }
  },

  confirmAuthoritativePayment: async (method, options) => {
    const { draft } = get();
    const bookingId = draft.bookingId || `bk_hotel_${Date.now()}`;
    const idempotencyKey = draft.idempotencyKey || `idem-pay-ht-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    set({ isSubmitting: true, lastError: null });
    try {
      const res = await bookingService.confirmPayment({
        bookingId,
        method,
        idempotencyKey,
        targetCurrency: options?.targetCurrency,
        paymentInstrument: options?.paymentInstrument,
      });

      if (!res.success) {
        set({ isSubmitting: false, lastError: res.error || 'Hotel payment rejected by server' });
        return {
          success: false,
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          error: res.error || 'Payment failed',
        };
      }

      set((s) => ({
        isSubmitting: false,
        draft: {
          ...s.draft,
          status: BookingStatus.CONFIRMED,
        },
      }));

      return {
        success: true,
        bookingStatus: BookingStatus.CONFIRMED,
        redirectUrl: res.redirectUrl,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hotel payment failed';
      set({ isSubmitting: false, lastError: message });
      return {
        success: false,
        bookingStatus: BookingStatus.PENDING_PAYMENT,
        error: message,
      };
    }
  },

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

  reset: () => set({ draft: emptyDraft, guestNames: [], isSubmitting: false, lastError: null }),

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
