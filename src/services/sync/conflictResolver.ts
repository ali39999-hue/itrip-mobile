import type { BookingStatus } from '@/domains/booking/state';
import type { UserProfile } from '@/services/api/authTypes';

/**
 * Domain-specific Conflict Resolution Engine (Phase 9 — Conflict Resolution).
 *
 * Implements strict domain conflict policies:
 * - Financial & Commerce (Wallet, Booking, Payment, Trips): SERVER-AUTHORITATIVE.
 *   Server financial ledger and allotment state always overrule local optimistic state.
 * - Identity / Profile: FIELD-AWARE MERGE.
 *   Local user edits merge with server data, but server-certified KYC status is immutable locally.
 * - Device & UI Preferences: CLIENT-AUTHORITATIVE.
 *   Theme, selected language, and display currency remain client-owned.
 */

export interface ConflictResolutionPolicy<T> {
  resolve(local: T, server: T): T;
}

/**
 * Booking status conflict resolution:
 * Terminal states (CANCELLED, REFUNDED) or server confirmed states always win over local pending states.
 */
export function resolveBookingConflict(localStatus: BookingStatus, serverStatus: BookingStatus): BookingStatus {
  // Server is the single source of financial and fulfillment truth
  return serverStatus;
}

/**
 * Profile field-aware merge:
 * Merges local non-empty fields into server profile, while preserving server-certified KYC status.
 */
export function resolveProfileConflict(local: Partial<UserProfile>, server: UserProfile): UserProfile {
  return {
    ...server,
    // User edits can update names and contact info if server hasn't locked them
    firstName: local.firstName || server.firstName,
    lastName: local.lastName || server.lastName,
    email: local.email || server.email,
    phone: server.phone || local.phone || '', // Server-verified phone is authoritative
    nationalId: local.nationalId || server.nationalId,
    passportNumber: local.passportNumber || server.passportNumber,
    // Server-certified KYC and loyalty cannot be elevated by client
    kycApproved: server.kycApproved,
    profileComplete: server.profileComplete,
    loyaltyTier: server.loyaltyTier,
    loyaltyPoints: server.loyaltyPoints,
  };
}

/**
 * Local device preferences conflict:
 * Local preference wins over server defaults (e.g. language or dark mode chosen on device).
 */
export function resolvePreferenceConflict<T>(localPref: T | undefined, serverPref: T): T {
  return localPref !== undefined ? localPref : serverPref;
}
