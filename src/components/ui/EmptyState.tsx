import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  iconPath?: string;
}

/**
 * Standardized Empty State Component (Phase 18).
 */
export function EmptyState({
  title,
  description,
  actionTitle,
  onAction,
  iconPath = 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center p-8 bg-surface rounded-2xl border border-slate-100 my-4">
      <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.sub} strokeWidth={1.5}>
          <Path d={iconPath} />
        </Svg>
      </View>
      <Text className="text-base font-bold text-ink text-center">{title}</Text>
      <Text className="text-xs text-sub text-center mt-1 max-w-xs">{description}</Text>
      {actionTitle && onAction ? (
        <View className="mt-4">
          <Button variant="outline" size="sm" title={actionTitle} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
