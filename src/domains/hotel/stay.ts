import { z } from 'zod';

/**
 * Hotel stay domain — date arithmetic and validation for hotel bookings.
 *
 * Night count is the number of whole nights between check-in and check-out
 * (check-out day does not count). All dates are YYYY-MM-DD (calendar days,
 * timezone-free) so a stay is identical regardless of the traveler's TZ.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const StayDatesSchema = z
  .object({
    checkIn: z.string().regex(DATE_RE),
    checkOut: z.string().regex(DATE_RE),
  })
  .refine((d) => d.checkIn < d.checkOut, {
    message: 'checkOut must be after checkIn',
  });

export type StayDates = z.infer<typeof StayDatesSchema>;

function dayNumber(iso: string): number {
  // Parse as UTC calendar day to keep arithmetic DST-free.
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d) / 86_400_000;
}

/** Whole nights between two calendar days; 0 or negative when invalid. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) return 0;
  return dayNumber(checkOut) - dayNumber(checkIn);
}

/** Adds days to a YYYY-MM-DD date; returns YYYY-MM-DD. */
export function addDays(iso: string, days: number): string {
  if (!DATE_RE.test(iso)) throw new Error(`Invalid date: ${iso}`);
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) + days));
  return dt.toISOString().slice(0, 10);
}

/** Validates a stay and returns the derived night count. */
export function validateStay(checkIn: string, checkOut: string): number {
  StayDatesSchema.parse({ checkIn, checkOut });
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw new Error('Stay must be at least one night');
  return nights;
}
