import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryTitle?: string;
}

/**
 * Standardized Error State Component (Phase 18).
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryTitle = 'Try Again',
}: ErrorStateProps) {
  return (
    <View className="items-center justify-center p-6 bg-rose-50/50 rounded-2xl border border-rose-100 my-4">
      <View className="w-12 h-12 rounded-full bg-rose-100 items-center justify-center mb-3">
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.rose} strokeWidth={2}>
          <Path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </Svg>
      </View>
      <Text className="text-sm font-bold text-rose-900 text-center">{title}</Text>
      <Text className="text-xs text-rose-700 text-center mt-1 max-w-xs">{message}</Text>
      {onRetry ? (
        <View className="mt-4">
          <Button variant="outline" size="sm" title={retryTitle} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
