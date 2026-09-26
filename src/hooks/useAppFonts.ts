import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

/**
 * Font loading hook — Firuzo typography stack:
 * - YekanBakh: FA/AR (Persian & Arabic scripts)
 * - Geist: EN/RU/ZH (Latin, Cyrillic, CJK)
 *
 * Font files must be dropped into assets/fonts/ with these exact names
 * before a production build (see ANDROID_ARCHITECTURE.md §Phase 1).
 * Until then the hook resolves immediately and text renders with the
 * system font — startup is never blocked.
 *
 * Keys match tailwind.config.js: fontFamily.yekan / fontFamily.geist
 */
export function useAppFonts(): { loaded: boolean } {
  const [loaded, setLoaded] = useState(false);

  // fontFiles may be undefined when the placeholder TTFs are absent/invalid;
  // expo-font then resolves with loaded=false and system fonts remain.
  const [expoLoaded, expoError] = Font.useFonts({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    YekanBakh: require('../../assets/fonts/YekanBakh-Regular.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Geist: require('../../assets/fonts/Geist-Regular.ttf'),
  });

  useEffect(() => {
    if (expoLoaded && !expoError) setLoaded(true);
    // Resolve even on failure so the UI is never blocked by missing fonts.
    if (expoError) setLoaded(true);
  }, [expoLoaded, expoError]);

  return { loaded };
}
