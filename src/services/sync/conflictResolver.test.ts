import { describe, it, expect } from 'vitest';
import {
  resolveBookingConflict,
  resolveProfileConflict,
  resolvePreferenceConflict,
} from './conflictResolver';
import type { UserProfile } from '@/stores/authStore';

describe('Conflict Resolution Engine (Phase 9)', () => {
  it('enforces server-authoritative rule on booking status', () => {
    // Even if local state thought it was PENDING_PAYMENT, server CONFIRMED wins
    expect(resolveBookingConflict('PENDING_PAYMENT', 'CONFIRMED')).toBe('CONFIRMED');

    // If server cancelled the booking (e.g. timeout on GDS), server CANCELLED wins
    expect(resolveBookingConflict('CONFIRMED', 'CANCELLED')).toBe('CANCELLED');
  });

  it('performs field-aware merge on user profile while keeping KYC server-authoritative', () => {
    const serverProfile: UserProfile = {
      phone: '+989120000000',
      firstName: 'Farhad',
      lastName: '',
      email: 'farhad@example.com',
      kycApproved: true,
      profileComplete: false,
      loyaltyTier: 'SILVER',
      loyaltyPoints: 300,
    };

    const localEdits: Partial<UserProfile> = {
      phone: '+989129999999', // Client trying to spoof phone
      lastName: 'Ahmadi', // Client completing last name
      kycApproved: false, // Client should not be able to override server KYC
    };

    const merged = resolveProfileConflict(localEdits, serverProfile);
    expect(merged.firstName).toBe('Farhad');
    expect(merged.lastName).toBe('Ahmadi');
    expect(merged.phone).toBe('+989120000000'); // Server-verified phone kept
    expect(merged.kycApproved).toBe(true); // Server-authoritative KYC kept
    expect(merged.loyaltyTier).toBe('SILVER');
  });

  it('allows local device preferences to win over server defaults', () => {
    const localLanguage = 'fa';
    const serverDefaultLanguage = 'en';
    expect(resolvePreferenceConflict(localLanguage, serverDefaultLanguage)).toBe('fa');

    // If local has no preference, server default applies
    expect(resolvePreferenceConflict(undefined, serverDefaultLanguage)).toBe('en');
  });
});
