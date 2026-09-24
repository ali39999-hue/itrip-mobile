import React from 'react';
import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'flat' | 'mint';
  className?: string;
}

export function Card({ variant = 'elevated', className = '', children, ...props }: CardProps) {
  const variantStyles = {
    elevated: 'bg-surface border border-slate-100 shadow-sm',
    flat: 'bg-soft border border-slate-200',
    mint: 'bg-mint border border-teal-100',
  }[variant];

  return (
    <View
      className={`rounded-2xl p-4 ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
