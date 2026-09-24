import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'brand', size = 'md', className = '', ...props }: BadgeProps) {
  const variantStyles = {
    brand: 'bg-mint text-brand',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-action',
    danger: 'bg-rose-50 text-rose',
    neutral: 'bg-slate-100 text-sub',
  }[variant];

  const textSizes = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <View className={`self-start rounded-full ${variantStyles.split(' ')[0]} ${textSizes} ${className}`} {...props}>
      <Text className={`font-medium ${variantStyles.split(' ')[1]} ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
        {label}
      </Text>
    </View>
  );
}
