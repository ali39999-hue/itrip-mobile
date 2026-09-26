import { useEffect, useRef, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { syncAll } from '@/services/sync/backgroundSync';

/**
 * Network connectivity hook — powers the offline banner and gates
 * mutations that require the server (offline-first invariants).
 *
 * Automatically triggers background sync cycle when connectivity is restored.
 */
export function useNetworkStatus(): { isOnline: boolean; isConnected: boolean } {
  const [state, setState] = useState<NetInfoState | null>(null);
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((s) => {
      const isNowConnected = s.isConnected ?? false;
      if (wasOffline.current && isNowConnected) {
        // Connectivity restored: drain mutation queue and sync
        void syncAll();
      }
      wasOffline.current = !isNowConnected;
      setState(s);
    });

    void NetInfo.fetch().then((s) => {
      wasOffline.current = !(s.isConnected ?? false);
      setState(s);
    });

    return () => unsubscribe();
  }, []);

  // Fail safe: assume offline until we know, so requests don't silently hang.
  const isConnected = state?.isConnected ?? false;
  return { isOnline: isConnected, isConnected };
}
