import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { hotelService, type RoomOffer } from '@/services/api';
import { useHotelStore } from '@/stores/hotelStore';
import { money } from '@/domains/currency/money';
import { priceStay } from '@/domains/booking/pricing';
import { nightsBetween } from '@/domains/hotel/stay';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { colors } from '@/styles/colors';

/**
 * Hotel results — shows room offers for a city + date range.
 * Selecting a room prices the stay (nights × rooms) with the pricing engine
 * and advances to the hotel review/checkout step.
 */
export default function HotelResultsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ city?: string; guests?: string }>();

  const [city, setCity] = useState(params.city ?? 'Shiraz');
  const [checkIn, setCheckIn] = useState('2026-11-12');
  const [checkOut, setCheckOut] = useState('2026-11-15');
  const [guests, setGuests] = useState(Number(params.guests ?? '2') || 2);
  const [rooms] = useState(1);

  const setSearch = useHotelStore((s) => s.setSearch);
  const selectOffer = useHotelStore((s) => s.selectOffer);

  const nights = nightsBetween(checkIn, checkOut);

  const search = useQuery({
    queryKey: ['hotels', city, checkIn, checkOut, guests, rooms],
    queryFn: () =>
      hotelService.searchHotels({
        city,
        checkIn,
        checkOut,
        guests,
        rooms,
      }),
    enabled: false,
    retry: 1,
  });

  const doSearch = () => {
    if (nights < 1) return;
    setSearch({ city, checkIn, checkOut, guests, rooms });
    void search.refetch();
  };

  const onOfferPress = (offer: RoomOffer) => {
    if (!useHotelStore.getState().draft.search) {
      setSearch({ city, checkIn, checkOut, guests, rooms });
    }
    selectOffer(offer, guests, rooms);
    router.push('/booking/hotel-review');
  };

  return (
    <View className="flex-1 bg-soft" style={{ paddingTop: insets.top }}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={search.isRefetching} onRefresh={() => void search.refetch()} />
        }
      >
        <Text className="text-2xl font-bold text-ink">{t('search.searchHotels')}</Text>

        {/* Search form */}
        <Card variant="elevated" className="mt-4">
          <Input label={t('search.to')} value={city} onChangeText={setCity} placeholder="Shiraz" />
          <Input
            label={t('search.departureDate')}
            value={checkIn}
            onChangeText={setCheckIn}
            placeholder="2026-11-12"
          />
          <Input
            label={t('search.returnDate')}
            value={checkOut}
            onChangeText={setCheckOut}
            placeholder="2026-11-15"
          />
          <Input
            label={t('search.passengersCount')}
            value={String(guests)}
            onChangeText={(v) => setGuests(Math.max(1, Math.min(10, Number(v.replace(/\D/g, '')) || 1)))}
            keyboardType="number-pad"
            maxLength={2}
          />
          <View className="mt-3">
            <Button
              title={t('search.searchHotels')}
              onPress={doSearch}
              loading={search.isFetching}
              disabled={nights < 1}
            />
          </View>
        </Card>

        {search.isLoading ? (
          <ActivityIndicator className="mt-10" size="large" color={colors.brand} />
        ) : null}

        {search.isError ? (
          <Card variant="flat" className="mt-6 items-center">
            <Text className="text-sm text-rose">{t('common.offline')}</Text>
            <View className="mt-3">
              <Button variant="outline" title={t('common.retry')} onPress={() => void search.refetch()} />
            </View>
          </Card>
        ) : null}

        {/* Room offer cards */}
        {(search.data?.offers ?? []).map((offer) => {
          const nightly = money(offer.nightlyRate, offer.currency);
          const total = nights > 0 ? priceStay(nightly, nights, rooms).total : null;
          return (
            <Card key={offer.id} variant="elevated" className="mt-4">
              <View className="flex-row items-center justify-between mb-2">
                <Badge label={`${offer.hotel.stars} ★`} variant="warning" size="sm" />
                {offer.freeCancellation ? (
                  <Badge label={t('hotel.freeCancellation')} variant="success" size="sm" />
                ) : null}
              </View>

              <Text className="text-base font-bold text-ink">{offer.hotel.name}</Text>
              <Text className="text-xs text-sub mt-0.5">{offer.roomType} · {offer.board}</Text>
              <Text className="text-[11px] text-sub mt-1" numberOfLines={1}>
                {offer.hotel.nameFa}
              </Text>

              <View className="flex-row items-center justify-between pt-3 mt-2 border-t border-slate-100">
                <View>
                  {total ? (
                    <>
                      <Text className="text-base font-bold text-price" style={{ writingDirection: 'ltr' }}>
                        {total.amount.toFixed(2)} {total.currency}
                      </Text>
                      <Text className="text-[10px] text-sub">
                        {nights} {t('hotel.nights')} · {rooms} {t('hotel.rooms')}
                      </Text>
                    </>
                  ) : (
                    <Text className="text-xs text-sub">{t('booking.noDraft')}</Text>
                  )}
                </View>
                <Button size="sm" title={t('common.confirm')} onPress={() => onOfferPress(offer)} />
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}
