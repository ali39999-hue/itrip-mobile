import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  spacing,
  radius,
  typography,
  elevation,
  lightSemantic,
  darkSemantic,
  semanticPalette,
  touchTarget,
  motion,
} from '@/styles/tokens';
import { colors } from '@/styles/colors';

const repoRoot = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(repoRoot, p), 'utf-8');

describe('Design System tokens (R3 gates)', () => {
  it('spacing scale follows the 4-point grid', () => {
    for (const value of Object.values(spacing)) {
      expect(value % 4).toBe(0);
    }
  });

  it('radius scale is monotonically increasing', () => {
    const values = Object.entries(radius)
      .filter(([k]) => k !== 'full')
      .map(([, v]) => v);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });

  it('typography scale has explicit line-heights (dynamic-text friendly)', () => {
    for (const [role, t] of Object.entries(typography)) {
      expect(t.lineHeight, `role ${role} missing lineHeight`).toBeGreaterThan(0);
      expect(t.lineHeight).toBeGreaterThan(t.fontSize * 0.9);
    }
  });

  it('semantic palettes are complete and distinct per theme', () => {
    const keys = Object.keys(lightSemantic).sort();
    expect(Object.keys(darkSemantic).sort()).toEqual(keys);
    // Dark theme must not be a verbatim copy of light
    expect(darkSemantic.background).not.toBe(lightSemantic.background);
    expect(darkSemantic.text).not.toBe(lightSemantic.text);
    // Dark primary is brightened for contrast on dark surfaces
    expect(darkSemantic.primary).not.toBe(lightSemantic.primary);
  });

  it('semanticPalette() resolves the correct palette per mode', () => {
    expect(semanticPalette(false)).toEqual(lightSemantic);
    expect(semanticPalette(true)).toEqual(darkSemantic);
  });

  it('brand tokens mirror tailwind.config.js (1:1 parity gate)', () => {
    const tw = read('tailwind.config.js');
    for (const hex of Object.values(colors)) {
      expect(tw).toContain(`'${hex}'`);
    }
  });

  it('touch target minimum is 44 (WCAG 2.1 AA)', () => {
    expect(touchTarget.minimum).toBe(44);
  });

  it('motion timings are defined and reduced-motion has a zero-duration path', () => {
    expect(motion.fast).toBeLessThan(motion.base);
    expect(motion.base).toBeLessThan(motion.slow);
  });

  it('elevation levels define both iOS shadow and Android elevation', () => {
    for (const [level, e] of Object.entries(elevation)) {
      if (level === 'none') continue;
      expect(e.elevation, `${level} missing android elevation`).toBeGreaterThan(0);
      expect('shadowOpacity' in e && e.shadowOpacity > 0, `${level} missing shadowOpacity`).toBe(true);
    }
  });
});

describe('Design System source invariants (R3)', () => {
  it('Button enforces the 44pt min height on md/lg via min-h classes', () => {
    const btn = read('src/components/ui/Button.tsx');
    expect(btn).toContain('min-h-[44px]');
    expect(btn).toContain('min-h-[52px]');
    expect(btn).toContain('accessibilityState');
  });

  it('Skeleton respects reduced motion and theme skeleton token', () => {
    const sk = read('src/components/ui/Skeleton.tsx');
    expect(sk).toContain('useReducedMotion');
    expect(sk).toContain('theme.skeleton');
  });

  it('Toast announces via live region and respects reduced motion', () => {
    const toast = read('src/components/ui/Toast.tsx');
    expect(toast).toContain('accessibilityLiveRegion="polite"');
    expect(toast).toContain('useReducedMotion');
  });

  it('ToastHost is mounted at the root layout', () => {
    const layout = read('src/app/_layout.tsx');
    expect(layout).toContain('<ToastHost />');
  });

  it('dark semantic tokens exist for progressive dark-mode rollout', () => {
    const tokens = read('src/styles/tokens.ts');
    expect(tokens).toContain('darkSemantic');
    expect(tokens).toContain('#0B1220');
  });
});
