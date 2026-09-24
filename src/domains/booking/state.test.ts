import { describe, it, expect } from 'vitest';
import { BookingStatus, canTransition } from './state';

describe('Booking State Machine Transitions', () => {
  it('allows valid transitions from PENDING_PAYMENT', () => {
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.EXPIRED)).toBe(true);
  });

  it('allows cancellation from CONFIRMED', () => {
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED)).toBe(true);
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT)).toBe(false);
  });

  it('forbids transitions from terminal states', () => {
    expect(canTransition(BookingStatus.CANCELLED, BookingStatus.CONFIRMED)).toBe(false);
    expect(canTransition(BookingStatus.EXPIRED, BookingStatus.CONFIRMED)).toBe(false);
  });
});
