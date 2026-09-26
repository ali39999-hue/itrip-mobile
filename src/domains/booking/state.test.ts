import { describe, it, expect } from 'vitest';
import {
  BookingStatus,
  canTransition,
  isBookingActive,
  isBookingPending,
  isBookingTerminal,
} from './state';

describe('Booking State Machine Transitions (Canonical iTRIP)', () => {
  it('allows valid transitions from PENDING_PAYMENT', () => {
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.PAYMENT_CONFIRMED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.EXPIRED)).toBe(true);
  });

  it('allows canonical full booking flow transitions', () => {
    expect(canTransition(BookingStatus.DRAFT, BookingStatus.HELD)).toBe(true);
    expect(canTransition(BookingStatus.HELD, BookingStatus.PENDING_PAYMENT)).toBe(true);
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.PAYMENT_CONFIRMED)).toBe(true);
    expect(canTransition(BookingStatus.PAYMENT_CONFIRMED, BookingStatus.CONFIRMING_SUPPLIER)).toBe(true);
    expect(canTransition(BookingStatus.CONFIRMING_SUPPLIER, BookingStatus.CONFIRMED)).toBe(true);
  });

  it('allows cancellation and refund lifecycle transitions', () => {
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCEL_REQUESTED)).toBe(true);
    expect(canTransition(BookingStatus.CANCEL_REQUESTED, BookingStatus.CANCELLING)).toBe(true);
    expect(canTransition(BookingStatus.CANCELLING, BookingStatus.CANCELLED)).toBe(true);
    expect(canTransition(BookingStatus.CANCELLED, BookingStatus.REFUND_INITIATED)).toBe(true);
    expect(canTransition(BookingStatus.REFUND_INITIATED, BookingStatus.REFUNDED)).toBe(true);
  });

  it('allows cancellation from CONFIRMED directly', () => {
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED)).toBe(true);
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT)).toBe(false);
  });

  it('forbids transitions from terminal states', () => {
    expect(canTransition(BookingStatus.CANCELLED, BookingStatus.CONFIRMED)).toBe(false);
    expect(canTransition(BookingStatus.EXPIRED, BookingStatus.CONFIRMED)).toBe(false);
    expect(canTransition(BookingStatus.REFUNDED, BookingStatus.CONFIRMED)).toBe(false);
  });

  it('correctly classifies booking state categories', () => {
    expect(isBookingActive(BookingStatus.CONFIRMED)).toBe(true);
    expect(isBookingActive(BookingStatus.CONFIRMING_SUPPLIER)).toBe(true);
    expect(isBookingActive(BookingStatus.CANCELLED)).toBe(false);

    expect(isBookingPending(BookingStatus.DRAFT)).toBe(true);
    expect(isBookingPending(BookingStatus.HELD)).toBe(true);
    expect(isBookingPending(BookingStatus.PENDING_PAYMENT)).toBe(true);
    expect(isBookingPending(BookingStatus.CONFIRMED)).toBe(false);

    expect(isBookingTerminal(BookingStatus.CANCELLED)).toBe(true);
    expect(isBookingTerminal(BookingStatus.REFUNDED)).toBe(true);
    expect(isBookingTerminal(BookingStatus.EXPIRED)).toBe(true);
    expect(isBookingTerminal(BookingStatus.CONFIRMED)).toBe(false);
  });
});
