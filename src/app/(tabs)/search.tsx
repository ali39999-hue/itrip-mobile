import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/** Extracts a 3-letter IATA code from free-text like "Tehran (IKA)". */
function extractIata(text: string, fallback: string): string {
  const match = text.match(/\b([A-Za-z]{3})\b/);
  return (match?.[1] ?? fallback).toUpperCase();
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'flights' | 'hotels'>('flights');
  const [from, setFrom] = useState('Tehran (IKA)');
  const [to, setTo] = useState('Shiraz (SYZ)');
  const [passengers, setPassengers] = useState(1);

  const popularRoutes = [
    { from: 'THR', to: 'SYZ', price: '$45', name: 'Tehran → Shiraz' },
    { from: 'THR', to: 'IFN', price: '$38', name: 'Tehran → Isfahan' },
    { from: 'THR', to: 'KIH', price: '$55', name: 'Tehran → Kish Island' },
    { from: 'MHD', to: 'THR', price: '$42', name: 'Mashhad → Tehran' },
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
      <View className="px-5 mb-4">
        <Text className="text-2xl font-bold text-ink">{t('search.title')}</Text>
      </View>

      {/* Mode Selector Tabs */}
      <View className="px-5 mb-5">
        <View className="flex-row rounded-2xl bg-surface border border-slate-200 p-1">
          <Pressable
            onPress={() => setTab('flights')}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
              tab === 'flights' ? 'bg-brand shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                tab === 'flights' ? 'text-white' : 'text-sub'
              }`}
            >
              {t('home.flights')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTab('hotels')}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
              tab === 'hotels' ? 'bg-brand shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                tab === 'hotels' ? 'text-white' : 'text-sub'
              }`}
            >
              {t('home.hotels')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Search Card */}
      <View className="px-5 mb-6">
        <Card variant="elevated" className="p-5">
          {tab === 'flights' ? (
            <>
              {/* Origin */}
              <View className="mb-3">
                <Text className="text-xs font-semibold text-sub mb-1">{t('search.from')}</Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-soft px-3.5 py-3">
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.brand} strokeWidth={2}>
                    <Path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </Svg>
                  <TextInput
                    value={from}
                    onChangeText={setFrom}
                    className="flex-1 ml-2.5 text-base font-semibold text-ink p-0"
                  />
                </View>
              </View>

              {/* Destination */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-sub mb-1">{t('search.to')}</Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-soft px-3.5 py-3">
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.action} strokeWidth={2}>
                    <Path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
                  </Svg>
                  <TextInput
                    value={to}
                    onChangeText={setTo}
                    className="flex-1 ml-2.5 text-base font-semibold text-ink p-0"
                  />
                </View>
              </View>
            </>
          ) : (
            <View className="mb-4">
              <Text className="text-xs font-semibold text-sub mb-1">{t('search.to')}</Text>
              <View className="flex-row items-center rounded-xl border border-slate-200 bg-soft px-3.5 py-3">
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.brand} strokeWidth={2}>
                  <Path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                </Svg>
                <TextInput
                  value={to}
                  onChangeText={setTo}
                  placeholder="Isfahan / Tehran / Shiraz"
                  placeholderTextColor={colors.sub}
                  className="flex-1 ml-2.5 text-base font-semibold text-ink p-0"
                />
              </View>
            </View>
          )}

          {/* Dates & Passengers Row */}
          <View className="flex-row justify-between mb-5">
            <View className="w-[48%] rounded-xl border border-slate-200 bg-soft p-3">
              <Text className="text-xs text-sub">{t('search.departureDate')}</Text>
              <Text className="text-sm font-bold text-ink mt-1">Tomorrow</Text>
            </View>

            <View className="w-[48%] rounded-xl border border-slate-200 bg-soft p-3">
              <Text className="text-xs text-sub">{t('search.passengersCount')}</Text>
              <View className="flex-row items-center justify-between mt-0.5">
                <Text className="text-sm font-bold text-ink">{passengers} Adult</Text>
                <View className="flex-row">
                  <Pressable
                    onPress={() => setPassengers((p) => Math.max(1, p - 1))}
                    className="w-6 h-6 rounded-md bg-white border border-slate-200 items-center justify-center mr-1"
                  >
                    <Text className="font-bold text-sub">-</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPassengers((p) => Math.min(9, p + 1))}
                    className="w-6 h-6 rounded-md bg-white border border-slate-200 items-center justify-center"
                  >
                    <Text className="font-bold text-brand">+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Search Single-Action Button */}
          <Button
            variant="action"
            size="lg"
            title={tab === 'flights' ? t('search.searchFlights') : t('search.searchHotels')}
            onPress={() => {
              if (tab === 'flights') {
                router.push({
                  pathname: '/booking/results',
                  params: {
                    origin: extractIata(from, 'IKA'),
                    destination: extractIata(to, 'SYZ'),
                    adults: String(passengers),
                  },
                });
              } else {
                // Hotel search now flows into the hotel booking funnel.
                router.push({
                  pathname: '/booking/hotel-results',
                  params: { city: to.replace(/\s*\([^)]*\)\s*$/, ''), guests: String(passengers) },
                });
              }
            }}
          />
        </Card>
      </View>

      {/* Popular Routes */}
      <View className="px-5">
        <Text className="text-base font-bold text-ink mb-3">{t('search.popularRoutes')}</Text>
        {popularRoutes.map((r, i) => (
          <Card key={i} variant="flat" className="flex-row items-center justify-between mb-3 bg-surface border border-slate-100">
            <View>
              <Text className="text-sm font-bold text-ink">{r.name}</Text>
              <Text className="text-xs text-sub mt-0.5">Mahan Air · Iran Air · Daily Flights</Text>
            </View>
            <View className="items-end">
              <Text className="text-base font-bold text-price">{r.price}</Text>
              <Badge label="Direct" variant="brand" size="sm" />
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
