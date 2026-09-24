import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/styles/colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helperText, containerStyle, containerClassName = '', className = '', ...props },
  ref,
) {
  return (
    <View style={containerStyle} className={`w-full ${containerClassName}`}>
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-ink">{label}</Text>
      ) : null}

      <TextInput
        ref={ref}
        placeholderTextColor={colors.sub}
        className={`rounded-xl border bg-soft px-4 py-3 text-base text-ink ${
          error ? 'border-rose' : 'border-slate-200 focus:border-brand'
        } ${className}`}
        {...props}
      />

      {error ? (
        <Text className="mt-1 text-xs text-rose">{error}</Text>
      ) : helperText ? (
        <Text className="mt-1 text-xs text-sub">{helperText}</Text>
      ) : null}
    </View>
  );
});
