import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/**
 * Booking Confirmation Screen — Phase 3 & 11 UI/UX.
 *
 * Confirms payment success with server-issued PNR and reference,
 * renders an immediate offline QR barcode pass, and guides the traveler
 * to their Travel Vault.
 */
export default function ConfirmationScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bookingRef?: string;
    pnr?: string;
    title?: string;
    origin?: string;
    destination?: string;
    date?: string;
    totalAmount?: string;
    currency?: string;
    kind?: 'flight' | 'hotel';
  }>();

  const bookingRef = params.bookingRef || '';
  // A PNR may legitimately be absent right after capture (issuance still in
  // flight). Fall back to the real booking reference — never fabricate one.
  const hasPnr = Boolean(params.pnr);
  const pnr = hasPnr ? (params.pnr as string) : bookingRef;
  const isFlight = params.kind !== 'hotel';

  return (
    <ScrollView
      className="flex-1 bg-soft"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Success Icon Header */}
      <View className="items-center mb-6">
        <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-3">
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={3}>
            <Path d="M20 6L9 17l-5-5" />
          </Svg>
        </View>
        <Text className="text-2xl font-bold text-ink">{t('booking.successTitle')}</Text>
        <Text className="text-xs text-sub mt-1 text-center">{t('booking.successBody')}</Text>
      </View>

      {/* Authoritative Booking Reference Card */}
      <Card variant="elevated" className="border-s-4 border-s-brand p-5 mb-4">
        <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
          <View>
            <Text className="text-xs text-sub">{t('myTrips.bookingRef')}</Text>
            <Text className="text-lg font-bold text-ink" style={{ writingDirection: 'ltr' }}>
              {bookingRef}
            </Text>
          </View>
          <Badge
            label={isFlight ? (hasPnr ? `PNR: ${pnr}` : bookingRef) : t('myTrips.confirmed')}
            variant="success"
            size="sm"
          />
        </View>

        <View className="py-3">
          <Text className="text-base font-bold text-ink">
            {params.title || t(isFlight ? 'booking.flightTicket' : 'booking.hotelReservation')}
          </Text>
          <Text className="text-xs text-sub mt-0.5" style={{ writingDirection: 'ltr' }}>
            {params.origin} → {params.destination} · {params.date}
          </Text>
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <Text className="text-xs text-sub">{t('booking.total')}</Text>
            <Text className="text-base font-bold text-price" style={{ writingDirection: 'ltr' }}>
              {params.totalAmount} {params.currency || 'USD'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Offline Pass / QR Barcode */}
      <Card variant="elevated" className="items-center p-6 mb-4 bg-white">
        <Text className="text-xs font-semibold text-sub mb-3">
          {t('voucher.qrHint')}
        </Text>
        <View className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <QRCode
            value={`ITRIP:${params.kind || 'PASS'}:${bookingRef}:${pnr}`}
            size={180}
            color={colors.ink}
            backgroundColor="#ffffff"
          />
        </View>
        <Text className="text-[11px] text-slate-400 mt-3 font-mono" style={{ writingDirection: 'ltr' }}>
          {bookingRef}
          {hasPnr ? ` · ${pnr}` : ''}
        </Text>
      </Card>

      {/* Offline Travel Vault Guarantee */}
      <View className="flex-row items-center rounded-2xl bg-emerald-50 border border-emerald-100 p-4 mb-6">
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
        <View className="flex-1 ms-3">
          <Text className="text-xs font-bold text-emerald-900">{t('voucher.savedOfflineTitle')}</Text>
          <Text className="text-[11px] text-emerald-700 mt-0.5">
            {t('voucher.savedOfflineBody')}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="gap-3">
        <Button
          variant="action"
          size="lg"
          title={t('myTrips.viewVoucher')}
          onPress={() => router.replace('/(tabs)/my-trips')}
        />
        <Button
          variant="outline"
          size="md"
          title={t('common.close')}
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </ScrollView>
  );
}
