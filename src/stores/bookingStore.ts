import { create } from 'zustand';
import type { FlightOffer, SearchFlightsParams, Airport } from '@/services/api';
import { Passenger } from '@/domains/identity/passenger';
import {
  BookingStatus,
  canTransition,
  classifyPaymentOutcome,
  type BookingStatus as Status,
  type PaymentOutcome,
} from '@/domains/booking/state';
import {
  priceBooking,
  convertBreakdown,
  type FareBreakdown,
} from '@/domains/booking/pricing';
import { money, type Money } from '@/domains/currency/money';
import { bookingService } from '@/services/api';
import Decimal from 'decimal.js';

/**
 * Booking store — one draft booking at a time (funnel state).
 *
 * Invariants:
 * - Status transitions go through canTransition (mirrors server lifecycle).
 * - The price shown is recomputed by the pricing engine; the server
 *   re-quotes at checkout and is the Source of Truth.
 * - Passengers must pass PassengerSchema before checkout is allowed.
 * - Financial transactions and booking confirmation are server-authoritative.
 */

export interface BookingDraft {
  search: SearchFlightsParams | null;
  offer: FlightOffer | null;
  passengers: Passenger[];
  status: Status;
  breakdown: FareBreakdown | null;
  /** Server re-quote reference once checkout has been initiated. */
  serverQuoteRef: string | null;
  /** Authoritative server booking ID */
  bookingId: string | null;
  /** Authoritative reference code (e.g. ITR-FL-XXXX) */
  serverReference: string | null;
  /** Confirmed airline PNR */
  pnr: string | null;
  /** Idempotency key protecting against duplicate checkouts */
  idempotencyKey: string | null;
}

interface BookingState {
  draft: BookingDraft;
  airports: Airport[];
  isSubmitting: boolean;
  lastError: string | null;
  setSearch: (search: SearchFlightsParams) => void;
  selectOffer: (offer: FlightOffer, pax: number) => void;
  addPassenger: (p: Passenger) => void;
  removePassenger: (id: string) => void;
  markCheckoutInitiated: (quoteRef: string) => void;
  /**
   * Server-authoritative draft reservation.
   * Creates an allotment hold on the backend before payment.
   */
  createAuthoritativeDraft: (contactPhone: string, contactEmail?: string) => Promise<{
    bookingId: string;
    reference: string;
  }>;
  /**
   * Server-authoritative payment execution.
   * Captures payment on backend ledger and confirms booking.
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
    /** R4 anti-double-charge: CAPTURED / DECLINED / REDIRECT_REQUIRED / UNKNOWN */
    outcome?: PaymentOutcome;
    pnr?: string;
    redirectUrl?: string;
    error?: string;
  }>;
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
  bookingId: null,
  serverReference: null,
  pnr: null,
  idempotencyKey: null,
};

export const useBookingStore = create<BookingState>((set, get) => ({
  draft: emptyDraft,
  airports: [],
  isSubmitting: false,
  lastError: null,

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
        bookingId: null,
        serverReference: null,
        pnr: null,
        idempotencyKey: null,
      },
      lastError: null,
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

  createAuthoritativeDraft: async (contactPhone, contactEmail) => {
    const { draft } = get();
    if (!draft.offer || !draft.search || draft.passengers.length === 0) {
      throw new Error('Incomplete booking draft: offer, search parameters and passengers required');
    }

    set({ isSubmitting: true, lastError: null });
    try {
      const idempotencyKey = draft.idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const seg = draft.offer.segments[0];
      const itemTitle = seg ? `${seg.airlineCode} ${seg.flightNumber} (${draft.search.origin} → ${draft.search.destination})` : 'Flight Ticket';

      const res = await bookingService.createDraft({
        idempotencyKey,
        type: 'FLIGHT',
        itemId: draft.offer.id,
        itemTitle,
        count: draft.passengers.length,
        travelDate: draft.search.departDate,
        passengers: draft.passengers.map((p) => ({
          firstName: p.firstNameLatin,
          lastName: p.lastNameLatin,
          passportNumber: p.passport.number,
          nationality: p.passport.nationality,
          type: p.type,
        })),
        contactPhone,
        contactEmail,
        source: 'MOBILE',
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to create booking draft on server');
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
      const message = err instanceof Error ? err.message : 'Draft creation failed';
      set({ isSubmitting: false, lastError: message });
      throw err;
    }
  },

  confirmAuthoritativePayment: async (method, options) => {
    const { draft } = get();
    const bookingId = draft.bookingId || `bk_${Date.now()}`;
    const idempotencyKey = draft.idempotencyKey || `idem-pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    set({ isSubmitting: true, lastError: null });
    try {
      const res = await bookingService.confirmPayment({
        bookingId,
        method,
        idempotencyKey,
        targetCurrency: options?.targetCurrency,
        paymentInstrument: options?.paymentInstrument,
      });

      // R4: classify the outcome before touching state. When the network
      // dropped mid-capture, `confirmPayment` returns success=false with an
      // error string — that is NOT a server DECLINE. Treating it as failure
      // while the server may still capture is how double charges happen.
      const serverResponded = !(
        res.error?.includes('unreachable') ||
        res.error?.includes('Network') ||
        res.error?.includes('timeout')
      );
      const outcome: PaymentOutcome = classifyPaymentOutcome({
        serverResponded,
        success: res.success,
        redirectUrl: res.redirectUrl,
        paymentStatus: res.paymentStatus,
      });

      if (outcome === 'UNKNOWN') {
        // Keep the draft in PENDING_PAYMENT: the user must verify with the
        // server (getBooking) instead of blindly re-submitting payment.
        set({ isSubmitting: false, lastError: null });
        return {
          success: false,
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          outcome,
          error: res.error || 'Payment status unknown — verifying with server',
        };
      }

      if (outcome === 'REDIRECT_REQUIRED') {
        set((s) => ({
          isSubmitting: false,
          draft: { ...s.draft, status: BookingStatus.PENDING_PAYMENT },
        }));
        return {
          success: false,
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          outcome,
          redirectUrl: res.redirectUrl,
        };
      }

      if (outcome === 'DECLINED') {
        set({ isSubmitting: false, lastError: res.error || 'Payment declined by server' });
        return {
          success: false,
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          outcome,
          error: res.error || 'Payment declined by server',
        };
      }

      // outcome === 'CAPTURED'
      const pnr = res.pnr || `PNR-${Date.now().toString(36).toUpperCase()}`;

      set((s) => ({
        isSubmitting: false,
        draft: {
          ...s.draft,
          status: BookingStatus.CONFIRMED,
          pnr,
        },
      }));

      return {
        success: true,
        bookingStatus: BookingStatus.CONFIRMED,
        outcome,
        pnr,
        redirectUrl: res.redirectUrl,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment confirmation failed';
      set({ isSubmitting: false, lastError: message });
      // Exceptions here are transport-level (axios threw) → UNKNOWN.
      return {
        success: false,
        bookingStatus: BookingStatus.PENDING_PAYMENT,
        outcome: 'UNKNOWN' as PaymentOutcome,
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

  reset: () => set({ draft: emptyDraft, isSubmitting: false, lastError: null }),

  setAirports: (airports) => set({ airports }),

  draftTotal: () => get().draft.breakdown?.total ?? null,

  draftTotalIn: (currency, rate) => {
    const bd = get().draft.breakdown;
    if (!bd) return null;
    return convertBreakdown(bd, new Decimal(rate), currency).total;
  },
}));

export type { Passenger };
