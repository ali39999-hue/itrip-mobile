/**
 * Booking state machine — server is the Source of Truth.
 * 100% aligned with the canonical iTRIP Platform Booking Lifecycle & State Machine Specification (v3.0).
 */
export const BookingStatus = {
  DRAFT: 'DRAFT',
  HELD: 'HELD',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  CONFIRMING_SUPPLIER: 'CONFIRMING_SUPPLIER',
  CONFIRMED: 'CONFIRMED',
  CANCEL_REQUESTED: 'CANCEL_REQUESTED',
  CANCELLING: 'CANCELLING',
  CANCELLED: 'CANCELLED',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUNDED: 'REFUNDED',
  EXPIRED: 'EXPIRED',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

/** Multi-dimensional payment status dimension */
export const PaymentStatus = {
  INITIATED: 'INITIATED',
  PENDING_CUSTOMER: 'PENDING_CUSTOMER',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Multi-dimensional fulfillment status dimension */
export const FulfillmentStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
} as const;

export type FulfillmentStatus = (typeof FulfillmentStatus)[keyof typeof FulfillmentStatus];

/** Multi-dimensional ticket issuance status dimension */
export const TicketStatus = {
  NOT_ISSUED: 'NOT_ISSUED',
  ISSUING: 'ISSUING',
  ISSUED: 'ISSUED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

/**
 * Valid state transitions table mirrored from BOOKING_LIFECYCLE.md §2.
 * Preserves backwards compatibility for direct PENDING_PAYMENT -> CONFIRMED and CONFIRMED -> CANCELLED.
 */
export const allowedTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
  DRAFT: ['HELD', 'PENDING_PAYMENT', 'CANCELLED'],
  HELD: ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'EXPIRED', 'CANCELLED'],
  PENDING_PAYMENT: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'EXPIRED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['CONFIRMING_SUPPLIER', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'],
  CONFIRMING_SUPPLIER: ['CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'],
  CONFIRMED: ['CANCEL_REQUESTED', 'CANCELLED'],
  CANCEL_REQUESTED: ['CANCELLING', 'CANCELLED'],
  CANCELLING: ['CANCELLED'],
  CANCELLED: ['REFUND_INITIATED', 'REFUNDED'],
  REFUND_INITIATED: ['REFUNDED'],
  REFUNDED: [],
  EXPIRED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

/** Check if booking is in an active (upcoming) state */
export function isBookingActive(status: BookingStatus): boolean {
  return (
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.CONFIRMING_SUPPLIER ||
    status === BookingStatus.PAYMENT_CONFIRMED
  );
}

/** Check if booking is in a pending payment / checkout state */
export function isBookingPending(status: BookingStatus): boolean {
  return (
    status === BookingStatus.DRAFT ||
    status === BookingStatus.HELD ||
    status === BookingStatus.PENDING_PAYMENT
  );
}

/** Check if booking is in a terminal state */
export function isBookingTerminal(status: BookingStatus): boolean {
  return (
    status === BookingStatus.CANCELLED ||
    status === BookingStatus.REFUNDED ||
    status === BookingStatus.EXPIRED
  );
}

/**
 * R4 — Payment outcome classification for the checkout step.
 *
 * A payment attempt ends in exactly one of these outcomes. The critical
 * safety property: when the server is unreachable mid-capture, the result
 * is UNKNOWN — never FAILED. Declaring failure when the server may still
 * capture is how double charges happen; the unknown path keeps the draft
 * in PENDING_PAYMENT and requires the user to poll/verify with the server.
 */
export type PaymentOutcome = 'CAPTURED' | 'DECLINED' | 'REDIRECT_REQUIRED' | 'UNKNOWN';

export function classifyPaymentOutcome(params: {
  serverResponded: boolean;
  success?: boolean;
  redirectUrl?: string | null;
  paymentStatus?: string | null;
}): PaymentOutcome {
  if (!params.serverResponded) return 'UNKNOWN';
  if (params.redirectUrl) return 'REDIRECT_REQUIRED';
  if (params.success === true) return 'CAPTURED';
  if (params.success === false) {
    const ps = (params.paymentStatus ?? '').toUpperCase();
    // A server rejection with a definitive status is DECLINED; anything
    // ambiguous ("PENDING", "PROCESSING") stays UNKNOWN.
    if (ps === 'FAILED' || ps === 'DECLINED' || ps === 'REJECTED') return 'DECLINED';
    return 'UNKNOWN';
  }
  return 'UNKNOWN';
}
