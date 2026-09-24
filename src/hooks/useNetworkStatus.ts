import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

/**
 * Network connectivity hook — powers the offline banner and gates
 * mutations that require the server (offline-first invariants).
 */
export function useNetworkStatus(): { isOnline: boolean; isConnected: boolean } {
  const [state, setState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((s) => setState(s));
    void NetInfo.fetch().then(setState);
    return () => unsubscribe();
  }, []);

  // Fail safe: assume offline until we know, so requests don't silently hang.
  const isConnected = state?.isConnected ?? false;
  return { isOnline: isConnected, isConnected };
}
