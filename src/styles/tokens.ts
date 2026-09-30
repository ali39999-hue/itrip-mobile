import { colors } from './colors';

/**
 * Firuzo Design Tokens (R3 — Navigation + Design System).
 *
 * Single source of truth for spacing, radius, typography, elevation and
 * semantic state colors. Components consume these via className (Tailwind
 * config mirrors the numeric scales) or via these constants in
 * non-className contexts.
 *
 * Invariant: token values mirror tailwind.config.js 1:1. Change both or
 * neither — the DS gate test (designSystem.test.ts) enforces parity.
 */

// ---------------------------------------------------------------------------
// Spacing scale (4-point grid) — mirrored by Tailwind's default spacing
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

// ---------------------------------------------------------------------------
// Radius system
// ---------------------------------------------------------------------------

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography scale — YekanBakh (fa/ar), Geist (en/ru/zh)
// ---------------------------------------------------------------------------

export const typography = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  subheading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
} as const;

export type TypographyRole = keyof typeof typography;

// ---------------------------------------------------------------------------
// Elevation / shadow system (Android-first: subtle, elevation-like)
// ---------------------------------------------------------------------------

export const elevation = {
  none: { shadowOpacity: 0, elevation: 0 },
  sm: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

export type ElevationLevel = keyof typeof elevation;

// ---------------------------------------------------------------------------
// Semantic colors — light theme (default) & dark theme
// ---------------------------------------------------------------------------

export interface SemanticPalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  action: string;
  success: string;
  danger: string;
  warning: string;
  skeleton: string;
}

export const lightSemantic: SemanticPalette = {
  background: colors.soft,
  surface: colors.surface,
  surfaceMuted: '#F1F5F9',
  text: colors.ink,
  textMuted: colors.sub,
  border: '#E2E8F0',
  primary: colors.brand,
  onPrimary: '#FFFFFF',
  action: colors.action,
  success: colors.success,
  danger: colors.rose,
  warning: colors.action,
  skeleton: '#E2E8F0',
};

export const darkSemantic: SemanticPalette = {
  background: '#0B1220',
  surface: '#131C2E',
  surfaceMuted: '#1B2740',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#24324C',
  primary: '#14C2BD', // brightened brand for dark contrast (WCAG on dark surfaces)
  onPrimary: '#0B1220',
  action: '#F5B34E',
  success: '#34D399',
  danger: '#FB7185',
  warning: '#FBBF24',
  skeleton: '#1E2A44',
};

// ---------------------------------------------------------------------------
// Motion system
// ---------------------------------------------------------------------------

export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  /** Respect OS "reduce motion" — components must check via useReducedMotion. */
  skeletonPulseMs: 800,
} as const;

// ---------------------------------------------------------------------------
// Touch target policy (accessibility)
// ---------------------------------------------------------------------------

export const touchTarget = {
  /** WCAG 2.1 AA + platform minimum for primary interactive elements. */
  minimum: 44,
} as const;

// ---------------------------------------------------------------------------
// Dark-mode detection contract (implemented by useTheme hook)
// ---------------------------------------------------------------------------

export function semanticPalette(isDark: boolean): SemanticPalette {
  return isDark ? darkSemantic : lightSemantic;
}
