import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { flightService, type FlightOffer } from '@/services/api';
import { useBookingStore } from '@/stores/bookingStore';
import { money } from '@/domains/currency/money';
import { priceBooking } from '@/domains/booking/pricing';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { colors } from '@/styles/colors';

/**
 * Flight results screen — Phase 2 booking funnel step 2.
 * Search form on top; offers fetched via flightService (Zod-validated).
 * Selecting an offer prices it with the pricing engine and advances
 * to the passengers step.
 */
export default function FlightResultsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ origin?: string; destination?: string; adults?: string }>();

  const [origin, setOrigin] = useState(params.origin?.toUpperCase() ?? 'IKA');
  const [destination, setDestination] = useState(params.destination?.toUpperCase() ?? 'SYZ');
  const [departDate, setDepartDate] = useState('2026-11-01');
  const [adults, setAdults] = useState(Number(params.adults ?? '2') || 2);

  const selectOffer = useBookingStore((s) => s.selectOffer);
  const setSearch = useBookingStore((s) => s.setSearch);

  const search = useQuery({
    queryKey: ['flights', origin, destination, departDate, adults],
    queryFn: () =>
      flightService.searchFlights({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departDate,
        adults,
        cabinClass: 'ECONOMY',
      }),
    enabled: false, // manual trigger via refetch
    retry: 1,
  });

  const doSearch = () => {
    setSearch({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departDate,
      adults,
      cabinClass: 'ECONOMY',
    });
    void search.refetch();
  };

  const onOfferPress = (offer: FlightOffer) => {
    selectOffer(offer, adults);
    router.push('/booking/passengers');
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
        <Text className="text-2xl font-bold text-ink">{t('search.searchFlights')}</Text>

        {/* Search form */}
        <Card variant="elevated" className="mt-4">
          <Input
            label={t('search.from')}
            value={origin}
            onChangeText={setOrigin}
            maxLength={3}
            autoCapitalize="characters"
            placeholder="IKA"
            className="uppercase"
          />
          <Input
            label={t('search.to')}
            value={destination}
            onChangeText={setDestination}
            maxLength={3}
            autoCapitalize="characters"
            placeholder="SYZ"
            className="uppercase"
          />
          <Input
            label={t('search.departureDate')}
            value={departDate}
            onChangeText={setDepartDate}
            placeholder="2026-11-01"
          />
          <Input
            label={t('search.passengersCount')}
            value={String(adults)}
            onChangeText={(v) => setAdults(Math.max(1, Math.min(9, Number(v.replace(/\D/g, '')) || 1)))}
            keyboardType="number-pad"
            maxLength={1}
          />
          <View className="mt-3">
            <Button title={t('search.searchFlights')} onPress={doSearch} loading={search.isFetching} />
          </View>
        </Card>

        {/* States */}
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

        {/* Offer cards */}
        {(search.data?.offers ?? []).map((offer) => {
          const seg = offer.segments[0];
          if (!seg) return null;
          const perPax = money(offer.priceAmount, offer.priceCurrency);
          const total = priceBooking(perPax, adults).total;
          return (
            <Card key={offer.id} variant="elevated" className="mt-4">
              <View className="flex-row items-center justify-between mb-3">
                <Badge label={`${seg.airlineCode} · ${seg.flightNumber}`} variant="brand" size="sm" />
                {offer.seatsLeft != null && offer.seatsLeft <= 3 ? (
                  <Badge label={`${offer.seatsLeft}`} variant="danger" size="sm" />
                ) : null}
              </View>

              {/* Route row — always LTR (airport codes invariant) */}
              <View className="flex-row items-center justify-between py-2">
                <View className="items-start">
                  <Text className="text-xl font-bold text-ink">{origin.toUpperCase()}</Text>
                  <Text className="text-[11px] text-sub">
                    {seg.departureTime.slice(11, 16)}
                  </Text>
                </View>
                <Text className="text-[11px] text-sub px-3">
                  {seg.durationMinutes}m · {seg.cabinClass === 'ECONOMY' ? 'ECO' : seg.cabinClass}
                </Text>
                <View className="items-end">
                  <Text className="text-xl font-bold text-ink">{destination.toUpperCase()}</Text>
                  <Text className="text-[11px] text-sub">{seg.arrivalTime.slice(11, 16)}</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                <View>
                  <Text
                    className="text-base font-bold text-price"
                    style={{ writingDirection: 'ltr' }}
                  >
                    {total.amount.toFixed(2)} {total.currency}
                  </Text>
                  <Text className="text-[10px] text-sub">
                    {t('search.passengersCount')}: {adults} · {offer.baggageKg}kg
                  </Text>
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
