import { create } from 'zustand';
import { getAccessToken, clearTokens } from '@/services/secure/tokens';
import { authService } from '@/services/api';

/**
 * Auth store — session state only.
 * Tokens themselves live exclusively in SecureStore (Keystore-backed),
 * never in this store, logs, or AsyncStorage.
 */
export type AuthStatus =
  | { state: 'loading' }
  | { state: 'guest' }
  | { state: 'authenticated'; userId: string; displayLanguage: string; phone?: string };

interface AuthState {
  auth: AuthStatus;
  biometricsEnabled: boolean;
  setAuthenticated: (userId: string, displayLanguage: string, phone?: string) => void;
  setGuest: () => void;
  setBiometrics: (enabled: boolean) => void;
  bootstrapAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  auth: { state: 'loading' },
  biometricsEnabled: false,

  setAuthenticated: (userId, displayLanguage, phone) =>
    set({ auth: { state: 'authenticated', userId, displayLanguage, phone } }),

  setGuest: () => set({ auth: { state: 'guest' } }),

  setBiometrics: (enabled) => set({ biometricsEnabled: enabled }),

  bootstrapAuth: async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        // Token exists in Keystore — restore active session
        set({
          auth: {
            state: 'authenticated',
            userId: 'usr_active',
            displayLanguage: 'fa',
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
