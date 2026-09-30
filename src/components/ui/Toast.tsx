import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from '@/styles/tokens';

/**
 * Toast / Snackbar system (R3 — Design System).
 *
 * A single app-level toast slot (mounted once, e.g. in the root layout)
 * driven by the module-level `toast` emitter. Variants map to semantic
 * state colors. Announced to screen readers via accessibilityLiveRegion.
 * Motion respects the OS reduced-motion setting.
 */

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastPayload {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

// Minimal event-based emitter (no store dependency needed at module level)
let currentToast: ToastPayload | null = null;
const listeners = new Set<(t: ToastPayload | null) => void>();
let toastSeq = 0;

function notify(): void {
  for (const fn of listeners) fn(currentToast);
}

function show(message: string, variant: ToastVariant = 'info', durationMs = 3200): void {
  currentToast = { id: `toast-${++toastSeq}`, message, variant, durationMs };
  notify();
}

function dismiss(): void {
  currentToast = null;
  notify();
}

export const toast = {
  show,
  dismiss,
} as const;

const VARIANT_CLASSES: Record<ToastVariant, { bg: string; text: string }> = {
  info: { bg: 'bg-ink', text: 'text-white' },
  success: { bg: 'bg-emerald-600', text: 'text-white' },
  warning: { bg: 'bg-amber-500', text: 'text-ink' },
  error: { bg: 'bg-rose-600', text: 'text-white' },
};

export function ToastHost(): React.ReactElement | null {
  const [toastItem, setToastItem] = useState<ToastPayload | null>(currentToast);
  const translateY = useRef(new Animated.Value(-40)).current;
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fn = (next: ToastPayload | null) => setToastItem(next ? { ...next } : null);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!toastItem) return;
    const duration = reducedMotion ? 1 : motion.base;
    Animated.timing(translateY, {
      toValue: 0,
      duration,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -60,
        duration,
        useNativeDriver: true,
      }).start(() => dismiss());
    }, toastItem.durationMs);
    return () => clearTimeout(timer);
  }, [toastItem, translateY, reducedMotion]);

  if (!toastItem) return null;
  const vc = VARIANT_CLASSES[toastItem.variant];

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 999 }}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        <View className={`rounded-xl px-4 py-3 shadow-md ${vc.bg}`}>
          <Text className={`text-sm font-medium ${vc.text}`}>{toastItem.message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

