import { describe, it, expect } from 'vitest';
import {
  nightsBetween,
  addDays,
  validateStay,
  StayDatesSchema,
  calculateTotalHotelGuests,
  RoomGuestSchema,
} from './stay';

describe('hotel stay domain', () => {
  it('counts whole nights between check-in and check-out', () => {
    expect(nightsBetween('2026-11-12', '2026-11-15')).toBe(3);
    expect(nightsBetween('2026-11-12', '2026-11-13')).toBe(1);
  });

  it('returns 0 when check-out is not after check-in', () => {
    expect(nightsBetween('2026-11-12', '2026-11-12')).toBe(0);
    expect(nightsBetween('2026-11-15', '2026-11-12')).toBeLessThan(0);
  });

  it('returns 0 for malformed dates instead of throwing', () => {
    expect(nightsBetween('nonsense', '2026-11-15')).toBe(0);
    expect(nightsBetween('2026-11-12', '15/11/2026')).toBe(0);
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-28', 5)).toBe('2026-12-03');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('adds days across a leap day correctly', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('validateStay returns the night count for a valid stay', () => {
    expect(validateStay('2026-11-12', '2026-11-15')).toBe(3);
  });

  it('validateStay throws for a zero-night stay', () => {
    expect(() => validateStay('2026-11-12', '2026-11-12')).toThrow();
  });

  it('validateStay throws for a reversed date range', () => {
    expect(() => validateStay('2026-11-15', '2026-11-12')).toThrow();
  });

  it('StayDatesSchema rejects a check-out before check-in', () => {
    const result = StayDatesSchema.safeParse({ checkIn: '2026-11-15', checkOut: '2026-11-12' });
    expect(result.success).toBe(false);
  });

  it('StayDatesSchema accepts a valid range', () => {
    const result = StayDatesSchema.safeParse({ checkIn: '2026-11-12', checkOut: '2026-11-15' });
    expect(result.success).toBe(true);
  });

  it('validates multi-room occupancy and calculates total guests', () => {
    const occupancies = [
      { adults: 2, children: 1 },
      { adults: 1, children: 0 },
      { adults: 2, children: 2 },
    ];
    const totals = calculateTotalHotelGuests(occupancies);
    expect(totals.totalAdults).toBe(5);
    expect(totals.totalChildren).toBe(3);
    expect(totals.totalGuests).toBe(8);
  });

  it('validates RoomGuest schema with lead guest flag', () => {
    const guest = RoomGuestSchema.parse({
      roomId: 'room-deluxe-1',
      roomIndex: 0,
      firstName: 'Sarah',
      lastName: 'Karimi',
      phone: '09123456789',
      isLeadGuest: true,
    });
    expect(guest.isLeadGuest).toBe(true);
    expect(guest.lastName).toBe('Karimi');
  });
});
