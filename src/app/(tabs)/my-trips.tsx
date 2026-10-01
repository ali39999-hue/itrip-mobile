import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Modal, Pressable, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useVaultStore } from '@/stores/vaultStore';
import { syncAll } from '@/services/sync/backgroundSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { formatIsoToJalali } from '@/domains/calendar/jalali';
import {
  buildFlightBarcodePayload,
  getVoucherScheduleTime,
  type FlightVoucher,
  type HotelVoucher,
} from '@/domains/voucher/voucher';

type TripTab = 'all' | 'upcoming' | 'completed';

/**
 * My Trips — The Digital Travel Vault (Phase 16 & Phase 17).
 *
 * Implements:
 * 1. Filter tabs: All, Upcoming, Completed.
 * 2. Searchable travel vault by booking reference, city, airline, or hotel.
 * 3. Offline-first: works completely without cellular connection or internet.
 * 4. Dual calendar date formatting (Persian Shamsi & Gregorian).
 * 5. High-contrast QR boarding pass barcodes for airport gates.
 * 6. Persian Taxi Driver Card for hotel navigation without cellular data.
 */
export default function MyTripsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const isPersian = i18n.language === 'fa';
  const vouchers = useVaultStore((s) => s.vouchers);
  const load = useVaultStore((s) => s.load);

  const [activeTab, setActiveTab] = useState<TripTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [driverFor, setDriverFor] = useState<HotelVoucher | null>(null);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncAll();
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const now = Date.now();

  const filteredVouchers = useMemo(() => {
    let list = vouchers;

    // Filter by tab
    if (activeTab === 'upcoming') {
      list = list.filter((v) => {
        const time = new Date(getVoucherScheduleTime(v)).getTime();
        return time >= now;
      });
    } else if (activeTab === 'completed') {
      list = list.filter((v) => {
        const time = new Date(getVoucherScheduleTime(v)).getTime();
        return time < now;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        if (v.bookingRef.toLowerCase().includes(q)) return true;
        if (v.kind === 'flight') {
          return (
            v.origin.toLowerCase().includes(q) ||
            v.destination.toLowerCase().includes(q) ||
            v.airline.toLowerCase().includes(q) ||
            v.flightNumber.toLowerCase().includes(q)
          );
        } else if (v.kind === 'hotel') {
          return (
            v.hotelName.toLowerCase().includes(q) ||
            v.hotelNameFa.includes(q) ||
            v.addressFa.includes(q)
          );
        } else if (v.kind === 'tour') {
          return (
            v.tourTitle.toLowerCase().includes(q) ||
            v.tourTitleFa.includes(q) ||
            v.city.toLowerCase().includes(q)
          );
        } else if (v.kind === 'transfer') {
          return (
            v.carTitle.toLowerCase().includes(q) ||
            v.pickupLocation.toLowerCase().includes(q) ||
            v.dropoffLocation.toLowerCase().includes(q)
          );
        }
        return false;
      });
    }

    return list;
  }, [vouchers, activeTab, searchQuery, now]);

  const flights = filteredVouchers.filter((v): v is FlightVoucher => v.kind === 'flight');
  const hotels = filteredVouchers.filter((v): v is HotelVoucher => v.kind === 'hotel');
  const activeQrFlight = vouchers.find((f): f is FlightVoucher => f.kind === 'flight' && f.bookingRef === qrFor) ?? null;

  return (
    <ScrollView
      className="flex-1 bg-soft"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
      }
    >
      <View className="px-5 mb-4">
        <Text className="text-2xl font-bold text-ink">{t('myTrips.title')}</Text>
        <Text className="text-xs text-sub mt-0.5">{t('myTrips.subtitle')}</Text>
      </View>

      {/* Offline Status Notice */}
      <View className="px-5 mb-4">
        <View className="flex-row items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-100 p-3.5">
          <View className="flex-row items-center flex-1 me-2">
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2}>
              <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </Svg>
            <Text className="ms-2 text-xs text-emerald-800 font-medium flex-1">
              {t('myTrips.offlineNotice')}
            </Text>
          </View>
          <Badge label={isOnline ? t('myTrips.cloudSync') : t('myTrips.encryptedVault')} variant="success" size="sm" />
        </View>
      </View>

      {/* Search Input in Vault */}
      <View className="px-5 mb-4">
        <View className="flex-row items-center rounded-xl bg-surface border border-slate-200 px-3.5 py-2.5 shadow-xs">
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.sub} strokeWidth={2}>
            <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </Svg>
          <TextInput
            placeholder={t('myTrips.searchPlaceholder')}
            placeholderTextColor={colors.sub}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ms-2 text-sm text-ink p-0"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-xs text-sub font-bold">✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Tab Filter Pills */}
      <View className="px-5 mb-5">
        <View className="flex-row rounded-2xl bg-surface border border-slate-200 p-1">
          {[
            { id: 'upcoming' as const, label: t('myTrips.active') },
            { id: 'completed' as const, label: t('myTrips.completed') },
            { id: 'all' as const, label: t('myTrips.all') },
          ].map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-xl items-center ${activeTab === tab.id ? 'bg-brand' : ''}`}
            >
              <Text className={`text-xs font-bold ${activeTab === tab.id ? 'text-white' : 'text-sub'}`}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Empty State */}
      {filteredVouchers.length === 0 ? (
        <View className="px-5">
          <EmptyState
            title={t('myTrips.noTrips')}
            description={t('myTrips.offlineNotice')}
          />
        </View>
      ) : null}

      {/* Flight Tickets Section */}
      {flights.length > 0 ? (
        <View className="px-5 mb-5">
          <Text className="text-base font-bold text-ink mb-3">{t('home.flights')}</Text>
          {flights.map((v) => {
            const isExpanded = expandedRef === v.bookingRef;
            return (
              <Card key={v.bookingRef} variant="elevated" className="border-t-4 border-t-brand p-5 mb-4">
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View>
                    <Text className="text-xs font-semibold text-sub">
                      {t('myTrips.bookingRef')}:{' '}
                      <Text className="text-ink font-bold" style={{ writingDirection: 'ltr' }}>
                        {v.bookingRef}
                      </Text>
                    </Text>
                    <Text className="text-sm font-bold text-ink mt-0.5" style={{ writingDirection: 'ltr' }}>
                      {v.airline} · {v.airlineCode}-{v.flightNumber}
                    </Text>
                  </View>
                  <Badge label={t('myTrips.confirmed')} variant="success" size="md" />
                </View>

                {/* Route Header */}
                <View className="flex-row items-center justify-between py-4">
                  <View>
                    <Text className="text-2xl font-bold text-ink" style={{ writingDirection: 'ltr' }}>
                      {v.origin}
                    </Text>
                    <Text className="text-xs text-sub" style={{ writingDirection: 'ltr' }}>
                      {v.originCity}
                    </Text>
                    <Text className="text-sm font-bold text-brand mt-1" style={{ writingDirection: 'ltr' }}>
                      {v.departureTime.slice(11, 16)}
                    </Text>
                  </View>

                  <View className="items-center px-4">
                    <Text className="text-xs text-sub">{v.durationMinutes}m</Text>
                    <Svg width={60} height={16} viewBox="0 0 60 16" fill="none">
                      <Path d="M0 8h45m0 0l-4-4m4 4l-4 4" stroke={colors.brand} strokeWidth={2} />
                    </Svg>
                    <Badge label={v.cabinClass} variant="neutral" size="sm" />
                  </View>

                  <View className="items-end">
                    <Text className="text-2xl font-bold text-ink" style={{ writingDirection: 'ltr' }}>
                      {v.destination}
                    </Text>
                    <Text className="text-xs text-sub" style={{ writingDirection: 'ltr' }}>
                      {v.destinationCity}
                    </Text>
                    <Text className="text-sm font-bold text-brand mt-1" style={{ writingDirection: 'ltr' }}>
                      {v.arrivalTime.slice(11, 16)}
                    </Text>
                  </View>
                </View>

                {/* Date & Manifest Info */}
                <View className="py-2.5 px-3 rounded-xl bg-soft/60 border border-slate-100 flex-row justify-between items-center mb-3">
                  <View>
                    <Text className="text-[11px] text-sub">{t('search.departureDate')}</Text>
                    <Text className="text-xs font-bold text-ink" style={{ writingDirection: 'ltr' }}>
                      {v.departureTime.slice(0, 10)}
                    </Text>
                    <Text className="text-[10px] text-brand">
                      {formatIsoToJalali(v.departureTime.slice(0, 10), isPersian ? 'fa' : 'en')}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[11px] text-sub">{t('myTrips.ticketNumber')}</Text>
                    <Text className="text-xs font-bold text-ink">{t('myTrips.travelers', { count: v.passengers.length })}</Text>
                  </View>
                </View>

                {/* Expandable Passenger Manifest */}
                {isExpanded ? (
                  <View className="mb-3 pt-2 border-t border-slate-100">
                    <Text className="text-xs font-bold text-ink mb-1.5">{t('booking.passengersTitle')}</Text>
                    {v.passengers.map((p, idx) => (
                      <View key={idx} className="flex-row items-center justify-between py-1">
                        <Text className="text-xs text-ink" style={{ writingDirection: 'ltr' }}>
                          {p.firstNameLatin} {p.lastNameLatin}
                        </Text>
                        <Text className="text-xs text-sub font-mono" style={{ writingDirection: 'ltr' }}>
                          {p.passportNumber}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View className="flex-row gap-2 mt-2">
                  <View className="flex-1">
                    <Button
                      variant="action"
                      size="md"
                      title={t('myTrips.showQr')}
                      onPress={() => setQrFor(v.bookingRef)}
                    />
                  </View>
                  <Pressable
                    onPress={() => setExpandedRef(isExpanded ? null : v.bookingRef)}
                    className="px-3 rounded-xl border border-slate-200 bg-surface items-center justify-center"
                  >
                    <Text className="text-xs font-bold text-sub">{isExpanded ? t('myTrips.less') : t('myTrips.details')}</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}

      {/* Hotel Vouchers Section */}
      {hotels.length > 0 ? (
        <View className="px-5 mb-5">
          <Text className="text-base font-bold text-ink mb-3">{t('home.hotels')}</Text>
          {hotels.map((v) => (
            <Card key={v.bookingRef} variant="elevated" className="border-t-4 border-t-action p-5 mb-4">
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View>
                  <Text className="text-xs font-semibold text-sub">{t('myTrips.hotelVoucher')}</Text>
                  <Text className="text-base font-bold text-ink mt-0.5">{v.hotelName}</Text>
                </View>
                <Badge label={t('myTrips.nightsCount', { count: v.nights })} variant="warning" size="sm" />
              </View>

              <View className="py-3">
                <Text className="text-xs text-sub">
                  {t('myTrips.checkin')} <Text className="text-ink font-semibold" style={{ writingDirection: 'ltr' }}>{v.checkIn.slice(0, 10)}</Text>
                </Text>
                <Text className="text-[10px] text-brand mb-1">
                  {formatIsoToJalali(v.checkIn.slice(0, 10), isPersian ? 'fa' : 'en')}
                </Text>
                <Text className="text-xs text-sub mt-1">
                  {t('myTrips.stay')} <Text className="text-ink font-semibold">{v.roomType}</Text>
                </Text>
              </View>

              <Button
                variant="outline"
                size="md"
                title={t('myTrips.driverCard')}
                onPress={() => setDriverFor(v)}
              />
            </Card>
          ))}
        </View>
      ) : null}

      {/* Taxi Driver Card Modal — AGENTS §5.2: intentionally Persian-only.
          This card is shown to Iranian taxi drivers who read Persian, so the
          offline display must stay in fa regardless of the app language. */}
      <Modal visible={driverFor !== null} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View
            className="bg-surface rounded-t-3xl p-6"
            style={{ paddingBottom: insets.bottom + 20 }}
          >
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />

            <Badge label="کارت مخصوص راننده تاکسی" variant="warning" size="md" className="mb-2" />
            <Text className="text-xl font-bold text-ink mb-1">
              لطفاً من را به این هتل برسانید:
            </Text>

            <View className="my-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
              <Text className="text-2xl font-bold text-ink text-center mb-2">
                {driverFor?.hotelNameFa ?? ''}
              </Text>
              <Text className="text-base text-ink text-center leading-6">
                {driverFor?.addressFa ?? ''}
              </Text>
              <Text
                className="text-sm font-semibold text-price text-center mt-3"
                style={{ writingDirection: 'ltr' }}
              >
                تلفن پذیرش: {driverFor?.phone ?? ''}
              </Text>
            </View>

            <Text className="text-xs text-sub text-center mb-4">
              {t('myTrips.driverCardHint')}
            </Text>

            <Button
              variant="brand"
              size="md"
              title={t('common.close')}
              onPress={() => setDriverFor(null)}
            />
          </View>
        </View>
      </Modal>

      {/* QR Code Ticket Modal — real scannable QR from vault payload */}
      <Modal visible={qrFor !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center p-6">
          <View className="bg-surface rounded-3xl p-6 w-full max-w-sm items-center">
            <Text className="text-lg font-bold text-ink mb-1">{t('myTrips.showQr')}</Text>
            <Text className="text-xs text-sub mb-5" style={{ writingDirection: 'ltr' }}>
              {activeQrFlight
                ? `${activeQrFlight.bookingRef} · ${activeQrFlight.airlineCode}-${activeQrFlight.flightNumber}`
                : ''}
            </Text>

            <View className="w-56 h-56 bg-white rounded-2xl items-center justify-center p-4 mb-4 border border-slate-200">
              {activeQrFlight && activeQrFlight.passengers[0] ? (
                <QRCode
                  value={buildFlightBarcodePayload(activeQrFlight, activeQrFlight.passengers[0])}
                  size={180}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                  quietZone={4}
                />
              ) : null}
            </View>

            <Text className="text-xs text-sub text-center mb-5">
              {t('voucher.qrHint')}
            </Text>

            <Button
              variant="outline"
              size="md"
              title={t('common.close')}
              className="w-full"
              onPress={() => setQrFor(null)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
