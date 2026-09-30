import React, { useEffect, useRef } from 'react';
import { Animated, type ViewProps, type DimensionValue } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';

interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  className?: string;
}

/**
 * Skeleton Loader Component (Phase 12 & Phase 18, R3-hardened).
 * Provides shimmering placeholder feedback while content is loading.
 *
 * R3 accessibility: when the OS "reduce motion" setting is active, the
 * pulse animation is replaced by a static placeholder (no loop).
 * R3 theming: the placeholder color comes from the semantic palette
 * (light/dark aware) instead of a hard-coded hex.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();

  useEffect(() => {
    if (reducedMotion) return; // static placeholder — no loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.skeleton,
          opacity: reducedMotion ? 0.5 : opacity,
        },
        style,
      ]}
      className={className}
      {...props}
    />
  );
}
