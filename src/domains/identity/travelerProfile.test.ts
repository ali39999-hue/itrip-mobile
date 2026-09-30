import { describe, it, expect } from 'vitest';
import {
  SavedTravelerSchema,
  toPassenger,
  savedFromPassenger,
  isSavedTravelerBookable,
  type SavedTraveler,
} from './travelerProfile';
import type { Passenger } from './passenger';

const basePassenger: Passenger = {
  firstNameLatin: 'Sara',
  lastNameLatin: 'Karimi',
  dateOfBirth: '1992-05-14',
  gender: 'FEMALE',
  type: 'ADULT',
  passport: {
    number: 'A1234567',
    nationality: 'IR',
    expiryDate: '2031-06-01',
  },
};

describe('Saved Traveler Profiles (R4)', () => {
  it('builds a saved profile from a validated passenger with a generated id', () => {
    const saved = savedFromPassenger(basePassenger, { label: 'Mum' });
    expect(saved.label).toBe('Mum');
    expect(saved.id).toMatch(/[0-9a-f-]{36}/);
    expect(saved.firstNameLatin).toBe('Sara');
  });

  it('validates against the same PassengerSchema contract (no weaker rules)', () => {
    const saved = savedFromPassenger(basePassenger);
    const parsed = SavedTravelerSchema.safeParse(saved);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid passport number — same rules as checkout', () => {
    const bad = savedFromPassenger({
      ...basePassenger,
      passport: { ...basePassenger.passport, number: 'bad!!' },
    });
    const parsed = SavedTravelerSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it('toPassenger drops bookkeeping fields (id/label/lastUsedAt)', () => {
    const saved: SavedTraveler = {
      ...savedFromPassenger(basePassenger, { label: 'Work' }),
      lastUsedAt: '2026-09-01T00:00:00Z',
    };
    const p = toPassenger(saved);
    expect('id' in p).toBe(false);
    expect('label' in p).toBe(false);
    expect('lastUsedAt' in p).toBe(false);
    expect(p.firstNameLatin).toBe('Sara');
    expect(p.passport.number).toBe('A1234567');
  });

  it('bookable while passport is valid 6 months past travel date', () => {
    const saved = savedFromPassenger(basePassenger);
    const check = isSavedTravelerBookable(saved, new Date('2026-11-15T00:00:00Z'));
    expect(check.bookable).toBe(true);
  });

  it('flags PASSPORT_EXPIRY when validity falls inside the 6-month window', () => {
    const saved = savedFromPassenger({
      ...basePassenger,
      passport: { ...basePassenger.passport, expiryDate: '2026-12-01' },
    });
    const check = isSavedTravelerBookable(saved, new Date('2026-11-15T00:00:00Z'));
    expect(check.bookable).toBe(false);
    expect(check.reason).toBe('PASSPORT_EXPIRY');
  });

  it('accepts an explicit id for deterministic tests/imports', () => {
    const saved = savedFromPassenger(basePassenger, {
      id: '0b9e6c1e-1111-4222-8333-444455556666',
    });
    expect(saved.id).toBe('0b9e6c1e-1111-4222-8333-444455556666');
  });
});
