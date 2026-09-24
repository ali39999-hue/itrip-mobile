import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const auth = useAuthStore((s) => s.auth);

  const services = [
    { id: 'flights', label: t('home.flights'), iconPath: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z' },
    { id: 'hotels', label: t('home.hotels'), iconPath: 'M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1' },
    { id: 'tours', label: t('home.tours'), iconPath: 'M12 2a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm1 12.93V17a1 1 0 0 1-2 0v-2.07A4 4 0 0 1 8 11a4 4 0 0 1 8 0 4 4 0 0 1-3 3.93z' },
    { id: 'cip', label: t('home.cip'), iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  ];

  const destinations = [
    { name: t('home.tehran'), tag: 'Capital & Museums' },
    { name: t('home.isfahan'), tag: 'Half of the World' },
    { name: t('home.shiraz'), tag: 'Culture & Wine' },
    { name: t('home.yazd'), tag: 'Desert Architecture' },
    { name: t('home.kish'), tag: 'Coral Island Beach' },
  ];

  return (
    <ScrollView
      className="flex-1 bg-soft"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 mb-4">
        <View>
          <Text className="text-2xl font-bold tracking-tight text-ink">
            iTrip <Text className="text-brand text-lg">· Firuzo</Text>
          </Text>
          <Text className="text-xs text-sub mt-0.5">
            {auth.state === 'authenticated'
              ? `${t('account.profile')}`
              : t('auth.guestGreeting')}
          </Text>
        </View>

        {auth.state !== 'authenticated' ? (
          <Button
            size="sm"
            variant="outline"
            title={t('auth.loginAction')}
            onPress={() => router.push('/(auth)/login')}
          />
        ) : (
          <Badge label="NewCash Active" variant="brand" />
        )}
      </View>

      {/* Hero Card */}
      <View className="px-5 mb-6">
        <View className="rounded-3xl bg-brand p-5 shadow-sm">
          <Badge label="Digital Travel Vault" variant="neutral" className="bg-white/20 text-white mb-2" />
          <Text className="text-xl font-bold text-white mb-1">
            {t('home.welcome')}
          </Text>
          <Text className="text-xs text-teal-50 opacity-90 mb-4">
            {t('home.subtitle')}
          </Text>

          <Button
            variant="action"
            size="md"
            title={t('search.searchFlights')}
            onPress={() => router.push('/(tabs)/search')}
          />
        </View>
      </View>

      {/* Service Shortcuts Grid */}
      <View className="px-5 mb-6">
        <Text className="text-base font-bold text-ink mb-3">{t('home.services')}</Text>
        <View className="flex-row justify-between">
          {services.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push('/(tabs)/search')}
              className="items-center w-[22%]"
            >
              <View className="w-14 h-14 rounded-2xl bg-surface border border-slate-100 items-center justify-center shadow-xs active:bg-mint">
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d={s.iconPath} />
                </Svg>
              </View>
              <Text className="text-xs font-medium text-ink mt-2 text-center" numberOfLines={1}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Upcoming Trip / Travel Vault Preview */}
      <View className="px-5 mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-ink">{t('home.upcomingTrip')}</Text>
          <Pressable onPress={() => router.push('/(tabs)/my-trips')}>
            <Text className="text-xs font-semibold text-brand">{t('tabs.myTrips')}</Text>
          </Pressable>
        </View>

        <Card variant="elevated" className="border-l-4 border-l-brand">
          <View className="flex-row items-center justify-between mb-2">
            <Badge label="Mahan Air · W5-104" variant="brand" size="sm" />
            <Badge label="CONFIRMED" variant="success" size="sm" />
          </View>

          <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
            <View>
              <Text className="text-xl font-bold text-ink">THR</Text>
              <Text className="text-xs text-sub">Tehran (IKA)</Text>
            </View>

            <View className="items-center px-4">
              <Text className="text-[11px] font-semibold text-brand">1h 20m</Text>
              <Text className="text-xs text-sub">────────✈</Text>
              <Text className="text-[10px] text-emerald-600 font-medium">Direct Flight</Text>
            </View>

            <View className="items-end">
              <Text className="text-xl font-bold text-ink">SYZ</Text>
              <Text className="text-xs text-sub">Shiraz (SYZ)</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-3">
            <View>
              <Text className="text-xs text-sub">Seat: <Text className="font-bold text-ink">14A</Text></Text>
              <Text className="text-[11px] text-emerald-600 font-medium mt-0.5">● Offline Vault Ready</Text>
            </View>

            <Button
              size="sm"
              variant="outline"
              title={t('myTrips.showQr')}
              onPress={() => router.push('/(tabs)/my-trips')}
            />
          </View>
        </Card>
      </View>

      {/* Top Destinations */}
      <View className="px-5">
        <Text className="text-base font-bold text-ink mb-3">{t('home.exploreIran')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
          {destinations.map((d, i) => (
            <Card
              key={i}
              variant="flat"
              className="mr-3 w-40 p-3.5 bg-surface border border-slate-100"
            >
              <View className="h-20 rounded-xl bg-mint items-center justify-center mb-2.5">
                <Text className="text-2xl font-bold text-brand">{d.name[0]}</Text>
              </View>
              <Text className="text-sm font-bold text-ink">{d.name}</Text>
              <Text className="text-[11px] text-sub mt-0.5" numberOfLines={1}>{d.tag}</Text>
            </Card>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}
