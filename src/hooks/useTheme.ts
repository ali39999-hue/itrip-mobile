import { useColorScheme } from 'react-native';
import { semanticPalette, type SemanticPalette } from '@/styles/tokens';

/**
 * Theme hook (R3) — resolves the active semantic palette from the OS
 * color scheme. The light palette is the product default; dark is a
 * first-class citizen (tokens exist, components consume them).
 *
 * Note: full per-screen dark rollout is progressive — screens should
 * migrate to `theme.*` semantics instead of hard-coded `text-ink` etc.
 * as they are touched. The tokens exist now so migration is mechanical.
 */
export function useTheme(): { isDark: boolean; theme: SemanticPalette } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { isDark, theme: semanticPalette(isDark) };
}
