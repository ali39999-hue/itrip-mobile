import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * Reduced-motion hook (R3 accessibility) — mirrors the OS "reduce motion"
 * setting. Animation-driven components (Skeleton, bottom sheets, hero
 * transitions) must disable or simplify motion when this returns true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    const update = (value: boolean) => {
      if (mounted) setReduced(value);
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
