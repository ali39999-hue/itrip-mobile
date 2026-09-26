import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { formatIsoToJalali } from '@/domains/calendar/jalali';

function extractIata(text: string, fallback: string): string {
  const match = text.match(/\b([A-Za-z]{3})\b/);
  return (match?.[1] ?? fallback).toUpperCase();
}

const POPULAR_HUBS = [
  { city: 'Tehran', iata: 'IKA', labelFa: 'تهران (IKA)' },
  { city: 'Shiraz', iata: 'SYZ', labelFa: 'شیراز (SYZ)' },
  { city: 'Isfahan', iata: 'IFN', labelFa: 'اصفهان (IFN)' },
  { city: 'Mashhad', iata: 'MHD', labelFa: 'مشهد (MHD)' },
  { city: 'Kish', iata: 'KIH', labelFa: 'کیش (KIH)' },
];

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isPersian = i18n.language === 'fa';

  const [tab, setTab] = useState<'flights' | 'hotels'>('flights');
  const [from, setFrom] = useState('Tehran (IKA)');
  const [to, setTo] = useState('Shiraz (SYZ)');
  const [departDate, setDepartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [returnDate, setReturnDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4);
    return nextWeek.toISOString().slice(0, 10);
  });
  const [passengers, setPassengers] = useState(1);
  const [datePickerTarget, setDatePickerTarget] = useState<'depart' | 'return' | null>(null);
  const [recentSearches, setRecentSearches] = useState<Array<{ from: string; to: string; tab: 'flights' | 'hotels' }>>([
    { from: 'Tehran (IKA)', to: 'Shiraz (SYZ)', tab: 'flights' },
    { from: 'Tehran (THR)', to: 'Isfahan (IFN)', tab: 'flights' },
    { from: 'Tehran', to: 'Shiraz', tab: 'hotels' },
  ]);

  const swapRoute = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSearch = () => {
    // Record recent search
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => !(r.from === from && r.to === to && r.tab === tab));
      return [{ from, to, tab }, ...filtered].slice(0, 5);
    });

    if (tab === 'flights') {
      const originCode = extractIata(from, 'IKA');
      const destCode = extractIata(to, 'SYZ');
      router.push({
        pathname: '/booking/results',
        params: {
          origin: originCode,
          destination: destCode,
          adults: String(passengers),
        },
      });
    } else {
      const cityName = to.replace(/\(.*?\)/g, '').trim() || 'Shiraz';
      router.push({
        pathname: '/booking/hotel-results',
        params: {
          city: cityName,
          checkIn: departDate,
          checkOut: returnDate,
          guests: String(passengers),
        },
      });
    }
  };

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

              {/* Swap Button */}
              <View className="items-center my--2 z-10">
                <Pressable
                  onPress={swapRoute}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center shadow-xs"
                >
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.brand} strokeWidth={2.5}>
                    <Path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </Svg>
                </Pressable>
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

          {/* Quick Hub Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {POPULAR_HUBS.map((h) => (
                <Pressable
                  key={h.iata}
                  onPress={() => setTo(`${h.city} (${h.iata})`)}
                  className="py-1 px-2.5 rounded-lg bg-slate-100 border border-slate-200"
                >
                  <Text className="text-xs text-ink font-medium">{isPersian ? h.labelFa : `${h.city} (${h.iata})`}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Dates & Passengers Row */}
          <View className="flex-row justify-between mb-5">
            <Pressable
              onPress={() => setDatePickerTarget('depart')}
              className="w-[48%] rounded-xl border border-slate-200 bg-soft p-3"
            >
              <Text className="text-xs text-sub">{t('search.departureDate')}</Text>
              <Text className="text-sm font-bold text-ink mt-1" style={{ writingDirection: 'ltr' }}>
                {departDate}
              </Text>
              <Text className="text-[10px] text-brand font-medium">
                {formatIsoToJalali(departDate, isPersian ? 'fa' : 'en')}
              </Text>
            </Pressable>

            <View className="w-[48%] rounded-xl border border-slate-200 bg-soft p-3">
              <Text className="text-xs text-sub">{t('search.passengersCount')}</Text>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-sm font-bold text-ink">{passengers} Pax</Text>
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

          {/* Search Action Button */}
          <Button
            variant="action"
            size="lg"
            title={tab === 'flights' ? t('search.searchFlights') : t('search.searchHotels')}
            onPress={handleSearch}
          />
        </Card>
      </View>

      {/* Recent Searches */}
      {recentSearches.length > 0 ? (
        <View className="px-5 mb-6">
          <Text className="text-base font-bold text-ink mb-3">{t('search.popularRoutes') || 'Recent Searches'}</Text>
          <View className="gap-2">
            {recentSearches.map((r, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  setFrom(r.from);
                  setTo(r.to);
                  setTab(r.tab);
                }}
                className="p-3 rounded-xl bg-surface border border-slate-200 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-lg bg-brand/10 items-center justify-center mr-3">
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.brand} strokeWidth={2}>
                      {r.tab === 'flights' ? (
                        <Path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                      ) : (
                        <Path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                      )}
                    </Svg>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-ink">
                      {r.from} → {r.to}
                    </Text>
                    <Text className="text-[10px] text-sub uppercase">
                      {r.tab}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-brand font-bold">Use</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerTarget !== null}
        selectedDate={datePickerTarget === 'depart' ? departDate : returnDate}
        onSelect={(d) => {
          if (datePickerTarget === 'depart') setDepartDate(d);
          else setReturnDate(d);
          setDatePickerTarget(null);
        }}
        onClose={() => setDatePickerTarget(null)}
      />
    </ScrollView>
  );
}
