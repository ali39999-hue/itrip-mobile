import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { t } = useTranslation();
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View className="flex-row items-center bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.action} strokeWidth={2}>
        <Path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
      </Svg>
      <Text className="ml-2 flex-1 text-xs font-medium text-action">
        {t('common.offline')} — {t('myTrips.offlineNotice')}
      </Text>
    </View>
  );
}
