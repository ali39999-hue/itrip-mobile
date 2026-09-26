import React, { useEffect, useRef } from 'react';
import { Animated, type ViewProps, type DimensionValue } from 'react-native';

interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  className?: string;
}

/**
 * Skeleton Loader Component (Phase 12 & Phase 18).
 * Provides shimmering placeholder feedback while content is loading.
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

  useEffect(() => {
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
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity,
        },
        style,
      ]}
      className={className}
      {...props}
    />
  );
}
