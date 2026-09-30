import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/colors';
import { touchTarget } from '@/styles/tokens';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'brand' | 'action' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Haptic feedback on press (R3 haptic policy). Default: light impact. */
  haptic?: 'none' | 'light' | 'medium' | 'success' | 'warning' | 'error';
}

const HAPTIC_MAP = {
  none: null,
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
} as const;

async function fireHaptic(kind: NonNullable<ButtonProps['haptic']>): Promise<void> {
  try {
    if (kind === 'none') return;
    if (kind === 'success' || kind === 'warning' || kind === 'error') {
      const map = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      } as const;
      await Haptics.notificationAsync(map[kind]);
      return;
    }
    const impact = HAPTIC_MAP[kind];
    if (impact) await Haptics.impactAsync(impact);
  } catch {
    // Haptics unsupported on this device — never block the press.
  }
}

export function Button({
  variant = 'brand',
  size = 'md',
  loading = false,
  disabled = false,
  title,
  children,
  className = '',
  haptic = 'light',
  onPress,
  ...rest
}: ButtonProps) {
  const baseClasses = 'flex-row items-center justify-center rounded-xl active:opacity-85';

  // R3 touch-target policy: md/lg buttons guarantee the 44pt minimum height.
  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3.5 min-h-[44px]',
    lg: 'px-6 py-4 min-h-[52px]',
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
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={(e) => {
        void fireHaptic(haptic);
        onPress?.(e);
      }}
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

export { touchTarget };
