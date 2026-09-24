import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/styles/colors';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'brand' | 'action' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Button({
  variant = 'brand',
  size = 'md',
  loading = false,
  disabled = false,
  title,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const baseClasses = 'flex-row items-center justify-center rounded-xl active:opacity-85';

  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3.5',
    lg: 'px-6 py-4',
  }[size];

  const variantClasses = {
    brand: 'bg-brand text-white',
    action: 'bg-action text-white',
    outline: 'border border-slate-200 bg-surface text-ink',
    ghost: 'bg-transparent text-brand',
  }[variant];

  const disabledClass = disabled || loading ? 'opacity-50' : '';

  const spinnerColor = variant === 'outline' || variant === 'ghost' ? colors.brand : '#FFFFFF';

  return (
    <Pressable
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${disabledClass} ${className}`}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {title ? (
            <Text
              className={`font-semibold text-center ${
                size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-base'
              } ${
                variant === 'outline' ? 'text-ink' : variant === 'ghost' ? 'text-brand' : 'text-white'
              }`}
            >
              {title}
            </Text>
          ) : (
            children
          )}
        </>
      )}
    </Pressable>
  );
}
