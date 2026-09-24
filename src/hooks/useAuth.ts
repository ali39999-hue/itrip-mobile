import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { getAccessToken } from '@/services/secure/tokens';

/**
 * Bootstrap the auth store on app start:
 * - if a valid token exists in SecureStore, restore the session
 * - otherwise mark as guest (login flow is enforced by the guard below)
 */
export function useAuthBootstrap(): void {
  const auth = useAuthStore((s) => s.auth);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setGuest = useAuthStore((s) => s.setGuest);

  useEffect(() => {
    if (auth.state !== 'loading') return;
    let cancelled = false;
    void (async () => {
      const token = await getAccessToken();
      if (cancelled) return;
      if (token) {
        // userId is resolved lazily from the API on first authorized call.
        setAuthenticated('restored', 'fa');
      } else {
        setGuest();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.state, setAuthenticated, setGuest]);
}

/**
 * Auth guard — call at the top of protected layouts/screens.
 * Redirects guests to the login flow while the session is being resolved.
 */
export function useRequireAuth(): void {
  const auth = useAuthStore((s) => s.auth);

  useAuthBootstrap();

  useEffect(() => {
    if (auth.state === 'guest') {
      router.replace('/(auth)/login');
    }
  }, [auth.state]);
}
