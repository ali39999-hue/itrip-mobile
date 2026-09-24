import { describe, it, expect } from 'vitest';
import {
  PassengerSchema,
  PassportSchema,
  isPassportValidForTravel,
} from './passenger';

describe('Passenger & Passport Validation Guard', () => {
  const validPassenger = {
    firstNameLatin: 'Alex',
    lastNameLatin: 'Smith',
    dateOfBirth: '1990-05-15',
    gender: 'MALE' as const,
    type: 'ADULT' as const,
    passport: {
      number: 'N8829103',
      nationality: 'FR',
      expiryDate: '2028-10-20',
    },
  };

  it('validates a correct passenger schema', () => {
    const result = PassengerSchema.safeParse(validPassenger);
    expect(result.success).toBe(true);
  });

  it('rejects invalid passport characters or length', () => {
    const invalidPassport = {
      number: 'abc_invalid!',
      nationality: 'FR',
      expiryDate: '2028-10-20',
    };
    const result = PassportSchema.safeParse(invalidPassport);
    expect(result.success).toBe(false);
  });

  it('validates passport expiry > 6 months beyond travel date', () => {
    const travelDate = new Date('2026-10-01T00:00:00Z');

    // Expires in 2028 (> 6 months)
    const validPass = {
      number: 'A1234567',
      nationality: 'DE',
      expiryDate: '2028-05-01',
    };
    expect(isPassportValidForTravel(validPass, travelDate)).toBe(true);

    // Expires in November 2026 (< 6 months from travel)
    const expiringSoonPass = {
      number: 'A1234567',
      nationality: 'DE',
      expiryDate: '2026-11-01',
    };
    expect(isPassportValidForTravel(expiringSoonPass, travelDate)).toBe(false);
  });
});
