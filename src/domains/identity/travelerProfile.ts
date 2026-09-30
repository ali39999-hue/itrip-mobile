import { z } from 'zod';
import { PassengerSchema, type Passenger } from './passenger';

/**
 * Saved Traveler Profile (R4 — Core Booking Experience).
 *
 * Reusable traveler records ("my companions") so repeat users don't
 * re-type passport data for every booking. Storage is local-first:
 * encrypted vault (SQLite via the VaultDriver) is the durable layer and
 * the Zustand store is the reactive cache — the same pattern as the
 * voucher vault.
 *
 * Invariants:
 * - A saved profile must satisfy the SAME PassengerSchema used at
 *   checkout — no weaker validation, no drift between save and use.
 * - KYC/sensitive fields (national ID) are optional and are NEVER sent
 *   to suppliers; only the fields in PassengerSchema travel.
 */

export const SavedTravelerSchema = PassengerSchema.extend({
  /** Stable client-generated ID (uuid) so bookings reference, not copy. */
  id: z.string().uuid(),
  /** Arbitrary user-facing label, e.g. "Mum", "Work colleague". */
  label: z.string().max(40).optional(),
  /** ISO timestamp of the last time this profile was used in a booking. */
  lastUsedAt: z.string().optional(),
});
export type SavedTraveler = z.infer<typeof SavedTravelerSchema>;

/** Convert a saved profile into a checkout-ready Passenger (drops bookkeeping fields). */
export function toPassenger(saved: SavedTraveler): Passenger {
  const { id: _id, label: _label, lastUsedAt: _lastUsedAt, ...passenger } = saved;
  return passenger;
}

/** Build a new saved profile from a checkout-validated passenger. */
export function savedFromPassenger(
  passenger: Passenger,
  opts: { id?: string; label?: string } = {},
): SavedTraveler {
  return {
    ...passenger,
    id: opts.id ?? cryptoRandomUuid(),
    label: opts.label,
  };
}

/** Passport-expiry re-check at reuse time (profile may have aged). */
export function isSavedTravelerBookable(saved: SavedTraveler, travelDate: Date): {
  bookable: boolean;
  reason?: string;
} {
  const expiry = new Date(saved.passport.expiryDate + 'T00:00:00Z');
  const sixMonthsAfter = new Date(travelDate);
  sixMonthsAfter.setUTCMonth(sixMonthsAfter.getUTCMonth() + 6);
  if (expiry.getTime() < sixMonthsAfter.getTime()) {
    return {
      bookable: false,
      reason: 'PASSPORT_EXPIRY',
    };
  }
  return { bookable: true };
}

/** Test-environment-safe uuid (crypto.randomUUID is Node 19+/Hermes-ready). */
function cryptoRandomUuid(): string {
  try {
    // Node / Hermes with crypto support
    const g = globalThis as { crypto?: { randomUUID?: () => string } };
    if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  } catch {
    // fall through to manual generation
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
