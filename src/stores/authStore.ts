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
          loyaltyPoints: 120,
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
              loyaltyPoints: 120,
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
        set({
          auth: {
            state: 'authenticated',
            userId: 'usr_active',
            displayLanguage: 'fa',
            profile: {
              phone: '09120000000',
              firstName: 'Traveler',
              lastName: 'Firuzo',
              kycApproved: true,
              profileComplete: true,
              loyaltyTier: 'BRONZE',
              loyaltyPoints: 120,
            },
          },
        });
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
    set({ auth: { state: 'guest' } });
  },
}));
