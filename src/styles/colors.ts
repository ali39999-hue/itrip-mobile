/**
 * Firuzo design tokens — kept 1:1 with the web platform's globals.css.
 * NativeWind reads the same values from tailwind.config.js; this module is
 * for non-className contexts (SVG, status bar, splash, programmatic styles).
 */
export const colors = {
  brand: '#00A9A5',
  brandDark: '#007572',
  mint: '#E6F6F5',
  action: '#F0A62A',
  actionHover: '#D98E16',
  price: '#9C6209',
  surface: '#FFFFFF',
  soft: '#F8FAFC',
  ink: '#0F172A',
  sub: '#64748B',
  rose: '#E11D48',
  success: '#10B981',
} as const;

export type ColorToken = keyof typeof colors;
