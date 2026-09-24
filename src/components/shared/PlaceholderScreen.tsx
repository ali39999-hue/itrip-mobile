import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface Props {
  title: string;
  phase: string;
}

/**
 * Placeholder for screens scheduled in later phases (Phase 2–3).
 * Keeps navigation complete while features are built out.
 */
export function PlaceholderScreen({ title, phase }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-soft px-8"
      style={{ paddingBottom: insets.bottom }}
    >
      <Text className="text-lg font-semibold text-ink">{title}</Text>
      <Text className="mt-2 text-center text-sm text-sub">
        {t('common.comingSoon', { phase })}
      </Text>
    </View>
  );
}
