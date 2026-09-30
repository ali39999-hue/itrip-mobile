import { create } from 'zustand';
import { getAccessToken, clearTokens } from '@/services/secure/tokens';
import { authService, api } from '@/services/api';

/**
 * User Profile interface aligned with itrip-platform canonical identity domain.
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

/**
 * Auth store — session state and profile.
 * Tokens themselves live exclusively in SecureStore (Keystore-backed),
 * never in this store, logs, or AsyncStorage.
 */
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

interface AuthState {
  auth: AuthStatus;
  biometricsEnabled: boolean;
  currency: 'USD' | 'IRR' | 'EUR' | 'AED' | 'CNY' | 'RUB';
  setAuthenticated: (userId: string, displayLanguage: string, phone?: string, profile?: UserProfile) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  setGuest: () => void;
  setBiometrics: (enabled: boolean) => void;
  setCurrency: (currency: 'USD' | 'IRR' | 'EUR' | 'AED' | 'CNY' | 'RUB') => void;
  bootstrapAuth: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  auth: { state: 'loading' },
  biometricsEnabled: false,
  currency: 'USD',

  setAuthenticated: (userId, displayLanguage, phone, profile) =>
    set({
      auth: {
        state: 'authenticated',
        userId,
        displayLanguage,
        phone,
        profile: profile || {
          phone: phone || '',
          kycApproved: false,
          profileComplete: false,
          loyaltyTier: 'BRONZE',
          loyaltyPoints: 0,
        },
      },
    }),

  setProfile: (updates) => {
    const current = get().auth;
    if (current.state !== 'authenticated') return;
    set({
      auth: {
        ...current,
        profile: current.profile
          ? { ...current.profile, ...updates }
          : {
              phone: current.phone || '',
              kycApproved: false,
              profileComplete: false,
              loyaltyTier: 'BRONZE',
              loyaltyPoints: 0,
              ...updates,
            },
      },
    });
  },

  setGuest: () => set({ auth: { state: 'guest' } }),

  setBiometrics: (enabled) => set({ biometricsEnabled: enabled }),

  setCurrency: (currency) => set({ currency }),

  fetchProfile: async () => {
    const current = get().auth;
    if (current.state !== 'authenticated') return;
    try {
      const res = await api.get('/user/profile');
      if (res.data?.user) {
        get().setProfile(res.data.user);
      }
    } catch {
      // Best-effort profile fetch
    }
  },

  bootstrapAuth: async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        // No demo identity: session is marked authenticated with an empty
        // profile shell; real identity is fetched from the authoritative
        // /user/profile endpoint (fetchProfile) — never hard-coded here.
        set({
          auth: {
            state: 'authenticated',
            userId: 'pending_profile',
            displayLanguage: 'fa',
            profile: undefined,
          },
        });
        await get().fetchProfile();
      } else {
        set({ auth: { state: 'guest' } });
      }
    } catch {
      set({ auth: { state: 'guest' } });
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      await clearTokens();
    }
    // R2: full local wipe — tokens, vouchers, queues, caches and the DB key.
    // The next account must never inherit any previous user's state.
    try {
      const { wipeUserDataForLogout } = await import('@/services/security/wipe');
      await wipeUserDataForLogout();
    } catch {
      // Wipe is best-effort per layer; token removal above already succeeded.
    }
    set({ auth: { state: 'guest' } });
  },
}));
