import React, { useEffect } from 'react';
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
import { useVaultStore } from '@/stores/vaultStore';
import { dirArrow, isRTL, ltrIsolate } from '@/i18n';
import type { FlightVoucher } from '@/domains/voucher/voucher';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  const insets = useSafeAreaInsets();
  const auth = useAuthStore((s) => s.auth);
  const vouchers = useVaultStore((s) => s.vouchers);
  const load = useVaultStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  const nextFlight = vouchers.find((v): v is FlightVoucher => v.kind === 'flight') ?? null;

  const services = [
    {
      id: 'flights',
      label: t('home.flights'),
      iconPath: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
    },
    {
      id: 'hotels',
      label: t('home.hotels'),
      iconPath: 'M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1',
    },
    {
      id: 'tours',
      label: t('home.tours'),
      iconPath: 'M12 2a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm1 12.93V17a1 1 0 0 1-2 0v-2.07A4 4 0 0 1 8 11a4 4 0 0 1 8 0 4 4 0 0 1-3 3.93z',
    },
    {
      id: 'trains',
      label: t('home.trains'),
      iconPath: 'M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8-11.5c4.5 0 6 .5 6 2v5H6V6c0-1.5 1.5-2 6-2zm-3.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
    },
    {
      id: 'visas',
      label: t('home.visas'),
      iconPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h4v2h-4v-2zm0 4h4v2h-4v-2z',
    },
    {
      id: 'rentals',
      label: t('home.rentals'),
      iconPath: 'M19 17h2c.55 0 1-.45 1-1v-3c0-1.3-.84-2.4-2-2.82V7c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v3.18C2.84 10.6 2 11.7 2 13v3c0 .55.45 1 1 1h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3zm-13-8h12v2H6V9zm2 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
    },
    {
      id: 'cip',
      label: t('home.cip'),
      iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    },
    {
      id: 'esim',
      label: t('home.esim'),
      iconPath: 'M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4zm3 2v4h6V6H9zm0 6v6h6v-6H9z',
    },
  ];

  const destinations = [
    { name: t('home.tehran'), tag: t('home.tagTehran') },
    { name: t('home.isfahan'), tag: t('home.tagIsfahan') },
    { name: t('home.shiraz'), tag: t('home.tagShiraz') },
    { name: t('home.yazd'), tag: t('home.tagYazd') },
    { name: t('home.kish'), tag: t('home.tagKish') },
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
          <Badge label={t('home.newcashActive')} variant="brand" />
        )}
      </View>

      {/* Hero Card */}
      <View className="px-5 mb-6">
        <View className="rounded-3xl bg-brand p-5 shadow-sm">
          <Badge label={t('home.digitalVault')} variant="neutral" className="bg-white/20 text-white mb-2" />
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
        <View className="flex-row flex-wrap justify-between gap-y-4">
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

        {nextFlight ? (
          // border-s = border-inline-start — logical (RTL-safe) border accent (§4.1)
          <Card variant="elevated" className="border-s-4 border-s-brand">
            <View className="flex-row items-center justify-between mb-2">
              <Badge
                label={ltrIsolate(`${nextFlight.airlineCode}-${nextFlight.flightNumber}`)}
                variant="brand"
                size="sm"
              />
              <Badge label={t('myTrips.confirmed')} variant="success" size="sm" />
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
              <View>
                <Text className="text-xl font-bold text-ink" style={{ writingDirection: 'ltr' }}>
                  {nextFlight.origin}
                </Text>
                <Text className="text-xs text-sub" style={{ writingDirection: 'ltr' }}>
                  {nextFlight.originCity}
                </Text>
              </View>

              <View className="items-center px-4">
                <Text className="text-[11px] font-semibold text-brand" style={{ writingDirection: 'ltr' }}>
                  {nextFlight.durationMinutes}m
                </Text>
                <Text className="text-xs text-sub">────────✈</Text>
                <Text className="text-[10px] text-emerald-600 font-medium">{t('home.directFlight')}</Text>
              </View>

              <View className="items-end">
                <Text className="text-xl font-bold text-ink" style={{ writingDirection: 'ltr' }}>
                  {nextFlight.destination}
                </Text>
                <Text className="text-xs text-sub" style={{ writingDirection: 'ltr' }}>
                  {nextFlight.destinationCity}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between pt-3">
              <View>
                <Text className="text-xs text-sub">
                  {t('search.departureDate')}:{' '}
                  <Text className="font-bold text-ink" style={{ writingDirection: 'ltr' }}>
                    {nextFlight.departureTime.slice(0, 10)}
                  </Text>
                </Text>
                <Text className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  {t('home.vaultReady')}
                </Text>
              </View>

              <Button
                size="sm"
                variant="outline"
                title={t('myTrips.showQr')}
                onPress={() => router.push('/(tabs)/my-trips')}
              />
            </View>
          </Card>
        ) : (
          <Card variant="flat" className="items-center p-5">
            <Text className="text-sm text-sub">{t('home.noUpcomingTrip')}</Text>
          </Card>
        )}
      </View>

      {/* SOS quick access */}
      <View className="px-5 mb-6">
        <Pressable
          onPress={() => router.push('/sos')}
          className="rounded-2xl bg-rose-50 border border-rose-100 p-4 flex-row items-center justify-between active:opacity-80"
        >
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-rose items-center justify-center">
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
                <Path d="M12 2 1 21h22L12 2zm0 6 7.53 13H4.47L12 8zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
              </Svg>
            </View>
            <View className="ms-3">
              <Text className="text-sm font-bold text-rose">SOS</Text>
              <Text className="text-[11px] text-rose-700/80">
                {t('sos.subtitle')}
              </Text>
            </View>
          </View>
          <Text className="text-xs font-semibold text-rose">{t('common.back')} {dirArrow(rtl)}</Text>
        </Pressable>
      </View>

      {/* Top Destinations */}
      <View className="px-5">
        <Text className="text-base font-bold text-ink mb-3">{t('home.exploreIran')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
          {destinations.map((d, i) => (
            <Card
              key={i}
              variant="flat"
              className="me-3 w-40 p-3.5 bg-surface border border-slate-100"
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
