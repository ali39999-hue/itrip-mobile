import { z } from 'zod';

/** Passenger schema — shared validation rules with the web platform. */

export const PassportSchema = z.object({
  number: z
    .string()
    .min(5)
    .max(20)
    .regex(/^[A-Z0-9]+$/, 'Passport number must be uppercase letters/digits'),
  nationality: z.string().length(2), // ISO 3166-1 alpha-2
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const PassengerSchema = z.object({
  id: z.string().uuid().optional(),
  firstNameLatin: z.string().min(1).max(60),
  lastNameLatin: z.string().min(1).max(60),
  firstNameLocal: z.string().max(60).optional(), // native script where required
  lastNameLocal: z.string().max(60).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['MALE', 'FEMALE']),
  type: z.enum(['ADULT', 'CHILD', 'INFANT']),
  passport: PassportSchema,
});

export type Passenger = z.infer<typeof PassengerSchema>;

/**
 * Passport validity guard: most airlines/immigration require 6+ months
 * validity beyond the travel date.
 */
export function isPassportValidForTravel(passport: Passport, travelDate: Date): boolean {
  const expiry = new Date(passport.expiryDate + 'T00:00:00Z');
  const sixMonthsAfterTravel = new Date(travelDate);
  sixMonthsAfterTravel.setUTCMonth(sixMonthsAfterTravel.getUTCMonth() + 6);
  return expiry.getTime() >= sixMonthsAfterTravel.getTime();
}

type Passport = z.infer<typeof PassportSchema>;
