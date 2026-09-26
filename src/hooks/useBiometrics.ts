import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Biometric auth hook — wraps expo-local-authentication.
 *
 * Used to gate sensitive areas (NewCash wallet, financial transactions)
 * per OWASP MASVS: the wallet tab requires a biometric prompt before
 * revealing balances or allowing transactions.
 */
export function useBiometrics() {
  const [hasHardware, setHasHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [hw, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (!cancelled) {
          setHasHardware(hw);
          setIsEnrolled(enrolled);
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Prompts the OS biometric dialog; resolves true only on success. */
  const authenticate = useCallback(async (reason: string): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // allow PIN/pattern as fallback
      });
      return result.success;
    } catch {
      return false;
    }
  }, []);

  return { hasHardware, isEnrolled, ready, authenticate };
}
