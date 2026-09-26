import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useVaultStore } from '@/stores/vaultStore';
import {
  buildFlightBarcodePayload,
  type FlightVoucher,
  type HotelVoucher,
} from '@/domains/voucher/voucher';

/**
 * My Trips — the offline Travel Vault.
 *
 * Everything rendered here comes from the local voucher database and works
 * with zero network. Each ticket exposes a real scannable QR (BCBP-style
 * payload for flights, reference payload for hotels) and a Persian Driver
 * Card for taxi rides.
 */
export default function MyTripsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const vouchers = useVaultStore((s) => s.vouchers);
  const load = useVaultStore((s) => s.load);

  const [qrFor, setQrFor] = useState<string | null>(null);
  const [driverFor, setDriverFor] = useState<HotelVoucher | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const flights = vouchers.filter((v): v is FlightVoucher => v.kind === 'flight');
  const hotels = vouchers.filter((v): v is HotelVoucher => v.kind === 'hotel');

  const activeQrFlight = flights.find((f) => f.bookingRef === qrFor) ?? null;

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
        <Text className="text-2xl font-bold text-ink">{t('myTrips.title')}</Text>
        <Text className="text-xs text-sub mt-0.5">Offline-Ready Travel Companion & Vault</Text>
      </View>

      {/* Offline Guarantee Notice Banner */}
      <View className="px-5 mb-5">
        <View className="flex-row items-center rounded-2xl bg-emerald-50 border border-emerald-100 p-3.5">
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2}>
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </Svg>
          <Text className="flex-1 ml-2.5 text-xs text-emerald-800 font-medium">
            {t('myTrips.offlineNotice')}
          </Text>
        </View>
      </View>

      {/* Empty state */}
      {vouchers.length === 0 ? (
        <View className="px-5">
          <Card variant="flat" className="items-center p-8">
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={colors.sub} strokeWidth={1.5}>
              <Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </Svg>
            <Text className="mt-3 text-sm font-semibold text-ink">{t('myTrips.noTrips')}</Text>
            <Text className="mt-1 text-xs text-sub text-center">
              {t('myTrips.offlineNotice')}
            </Text>
          </Card>
        </View>
      ) : null}

      {/* Flight tickets */}
      {flights.length > 0 ? (
        <View className="px-5 mb-5">
          <Text className="text-base font-bold text-ink mb-3">{t('myTrips.active')}</Text>
          {flights.map((v) => (
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
                <Badge label="CONFIRMED" variant="success" size="md" />
              </View>

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

              <View className="flex-row justify-between py-3 border-t border-slate-100 bg-soft/50 rounded-xl px-3 my-1">
                <View>
                  <Text className="text-[11px] text-sub">{t('myTrips.ticketNumber')}</Text>
                  <Text className="text-sm font-bold text-ink">{v.passengers.length}</Text>
                </View>
                <View>
                  <Text className="text-[11px] text-sub">{t('search.departureDate')}</Text>
                  <Text className="text-sm font-bold text-ink" style={{ writingDirection: 'ltr' }}>
                    {v.departureTime.slice(0, 10)}
                  </Text>
                </View>
              </View>

              <View className="mt-3">
                <Button
                  variant="action"
                  size="md"
                  title={t('myTrips.showQr')}
                  onPress={() => setQrFor(v.bookingRef)}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Hotel vouchers */}
      {hotels.map((v) => (
        <View key={v.bookingRef} className="px-5 mb-5">
          <Card variant="elevated" className="border-t-4 border-t-action p-5">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View>
                <Text className="text-xs font-semibold text-sub">Hotel Voucher</Text>
                <Text className="text-base font-bold text-ink mt-0.5">{v.hotelName}</Text>
              </View>
              <Badge label={`${v.nights} NIGHTS`} variant="warning" size="sm" />
            </View>

            <View className="py-3">
              <Text className="text-xs text-sub">
                Check-in: <Text className="text-ink font-semibold" style={{ writingDirection: 'ltr' }}>{v.checkIn.slice(0, 10)}</Text>
              </Text>
              <Text className="text-xs text-sub mt-1">
                Stay: <Text className="text-ink font-semibold">{v.roomType}</Text>
              </Text>
            </View>

            <Button
              variant="outline"
              size="md"
              title={t('myTrips.driverCard')}
              onPress={() => setDriverFor(v)}
            />
          </Card>
        </View>
      ))}

      {/* Taxi Driver Card Modal — large Persian address, works offline */}
      <Modal visible={driverFor !== null} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-surface rounded-t-3xl p-6">
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
              {t('myTrips.hotelAddress')} — بدون نیاز به اینترنت
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
              High-Contrast Offline QR for Airport Scanner
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
