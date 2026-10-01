import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/styles/colors';
import {
  HomeIcon,
  SearchIcon,
  TripsIcon,
  WalletIcon,
  AccountIcon,
} from '@/components/ui/TabIcons';

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // §2.4: a custom tabBar height overrides @react-navigation's built-in
  // paddingBottom: insets.bottom, so the Home Indicator / gesture-bar inset
  // must be re-added explicitly (minimum 8 on devices without one).
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.sub,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: '#E2E8F0',
          paddingTop: 8,
          paddingBottom: bottomInset,
          height: 60 + bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color, size }) => <SearchIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="my-trips"
        options={{
          title: t('tabs.myTrips'),
          tabBarIcon: ({ color, size }) => <TripsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.wallet'),
          tabBarIcon: ({ color, size }) => <WalletIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color, size }) => <AccountIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
