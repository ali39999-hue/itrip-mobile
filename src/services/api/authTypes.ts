/**
 * Auth session contract — shared between the API client, the sync conflict
 * resolver and the auth store.
 *
 * These types live in the infrastructure layer so that services never import
 * from `src/stores` (state layer) — the dependency stays one-way (§5.1).
 */

/**
 * User Profile aligned with itrip-platform canonical identity domain.
 */
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  nationalId?: string;
  passportNumber?: string;
  kycApproved: boolean;
  profileComplete: boolean;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  loyaltyPoints: number;
}

export type AuthStatus =
  | { state: 'loading' }
  | { state: 'guest' }
  | {
      state: 'authenticated';
      userId: string;
      displayLanguage: string;
      phone?: string;
      profile?: UserProfile;
    };
