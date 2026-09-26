import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { useHotelStore } from '@/stores/hotelStore';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useVaultStore } from '@/stores/vaultStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { bookingService } from '@/services/api';
import type { HotelVoucher } from '@/domains/voucher/voucher';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { colors } from '@/styles/colors';

type PaymentRail = 'wallet_irr' | 'gateway_shetab' | 'gateway_ecardo';

/**
 * Hotel review & checkout — Phase 3 & 4 Server-Authoritative Hotel Booking Funnel.
 *
 * Implements:
 * 1. Server quote validation for hotel room allotment.
 * 2. Multi-rail payment selection: NewCash, Shetab Cards, eCardo.
 * 3. Server draft hold creation.
 * 4. Authoritative server payment capture.
 * 5. Offline HotelVoucher persistence with Persian taxi Driver Card.
 */
export default function HotelReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const authState = useAuthStore((s) => s.auth);
  const draft = useHotelStore((s) => s.draft);
  const nights = useHotelStore((s) => s.nights);
  const cancel = useHotelStore((s) => s.cancel);
  const reset = useHotelStore((s) => s.reset);
  const guestNames = useHotelStore((s) => s.guestNames);
  const setGuestNames = useHotelStore((s) => s.setGuestNames);
  const isSubmitting = useHotelStore((s) => s.isSubmitting);
  const lastError = useHotelStore((s) => s.lastError);
  const createAuthoritativeDraft = useHotelStore((s) => s.createAuthoritativeDraft);
  const confirmAuthoritativePayment = useHotelStore((s) => s.confirmAuthoritativePayment);
  const addHotelVoucher = useVaultStore((s) => s.addHotelVoucher);

  const [paymentRail, setPaymentRail] = useState<PaymentRail>('wallet_irr');
  const [processing, setProcessing] = useState(false);
  const [guestInput, setGuestInput] = useState('');

  const offer = draft.offer;
  const breakdown = draft.breakdown;
  const search = draft.search;

  const onPay = async () => {
    if (authState.state !== 'authenticated') {
      router.push('/(auth)/login');
      return;
    }
    if (!offer || !breakdown || !search) return;

    setProcessing(true);
    try {
      // 1. Validate quote freshness
      const quoteCheck = await bookingService.validateQuote({
        type: 'HOTEL',
        itemId: offer.id,
        expectedAmount: breakdown.total.amount.toFixed(2),
        expectedCurrency: breakdown.total.currency,
      });

      if (!quoteCheck.valid || quoteCheck.priceMismatch) {
        setProcessing(false);
        Alert.alert(
          t('common.error'),
          `Room price updated to ${quoteCheck.serverAmount} ${quoteCheck.serverCurrency}. Please review.`,
        );
        return;
      }

      // 2. Create authoritative server booking draft with soft lock
      const userPhone = authState.phone || '09120000000';
      const draftResult = await createAuthoritativeDraft(userPhone);

      // 3. Confirm payment on backend
      const payResult = await confirmAuthoritativePayment(paymentRail);

      if (!payResult.success) {
        setProcessing(false);
        Alert.alert(t('common.error'), payResult.error || 'Payment declined by server');
        return;
      }

      // 4. Save confirmed voucher to local offline vault
      const bookingRef = draftResult.reference || `ITR-HT-${Date.now().toString(36).toUpperCase()}`;
      const n = nights();
      const voucher: HotelVoucher = {
        kind: 'hotel',
        bookingRef,
        createdAt: new Date().toISOString(),
        hotelName: offer.hotel.name,
        hotelNameFa: offer.hotel.nameFa,
        addressFa: offer.hotel.addressFa,
        phone: offer.hotel.phone,
        checkIn: `${search.checkIn}T14:00:00Z`,
        checkOut: `${search.checkOut}T12:00:00Z`,
        nights: n,
        roomType: offer.roomType,
        guests: draft.guests,
        total: { amount: breakdown.total.amount.toFixed(2), currency: breakdown.total.currency },
      };
      await addHotelVoucher(voucher);

      // 5. Sync wallet balance with server
      void useWalletStore.getState().syncWithServer();

      setProcessing(false);

      // 6. Navigate to confirmation screen
      router.replace({
        pathname: '/booking/confirmation' as never,
        params: {
          bookingRef,
          title: offer.hotel.name,
          origin: search.city,
          destination: offer.roomType,
          date: search.checkIn,
          totalAmount: breakdown.total.amount.toFixed(2),
          currency: breakdown.total.currency,
          kind: 'hotel',
        },
      });
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('common.error'), msg);
    }
  };

  const onCancel = () => {
    Alert.alert(t('booking.reviewTitle'), t('booking.cancelConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('booking.cancelBooking'),
        style: 'destructive',
        onPress: () => {
          try {
            cancel();
            reset();
            router.back();
          } catch (e) {
            Alert.alert(t('common.error'), String((e as Error).message ?? e));
          }
        },
      },
    ]);
  };

  if (!offer || !breakdown || !search) {
    return (
      <View
        className="flex-1 bg-soft items-center justify-center"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Text className="text-sm text-sub">{t('booking.noDraft')}</Text>
        <View className="mt-4">
          <Button
            variant="outline"
            title={t('search.searchHotels')}
            onPress={() => router.replace('/booking/hotel-results')}
          />
        </View>
      </View>
    );
  }

  const n = nights();

  return (
    <View className="flex-1 bg-soft" style={{ paddingTop: insets.top }}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 160 }}>
        <Text className="text-2xl font-bold text-ink">{t('booking.reviewTitle')}</Text>

        {/* Stay summary */}
        <Card variant="elevated" className="mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Badge label={`${offer.hotel.stars} ★`} variant="warning" size="sm" />
            <Badge
              label={draft.status}
              variant={draft.status === 'CONFIRMED' ? 'success' : 'warning'}
              size="sm"
            />
          </View>
          <Text className="text-lg font-bold text-ink">{offer.hotel.name}</Text>
          <Text className="text-xs text-sub mt-1">{offer.roomType}</Text>
          <View className="flex-row justify-between py-2 mt-2 border-t border-slate-100">
            <Text className="text-xs text-sub">{t('search.departureDate')}</Text>
            <Text className="text-xs font-bold text-ink" style={{ writingDirection: 'ltr' }}>
              {search.checkIn}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-sub">{t('search.returnDate')}</Text>
            <Text className="text-xs font-bold text-ink" style={{ writingDirection: 'ltr' }}>
              {search.checkOut}
            </Text>
          </View>
          <Text className="text-[11px] text-sub mt-1">
            {n} {t('hotel.nights')} · {draft.guests} {t('hotel.guests')} · {draft.rooms} {t('hotel.rooms')}
          </Text>
        </Card>

        {/* Lead guest name */}
        <Card variant="elevated" className="mt-4">
          <Text className="text-sm font-bold text-ink mb-2">{t('hotel.leadGuest')}</Text>
          <TextInput
            className="rounded-xl border border-slate-200 bg-soft px-4 py-3 text-base text-ink"
            placeholder={t('hotel.leadGuestPlaceholder')}
            placeholderTextColor={colors.sub}
            value={guestInput}
            onChangeText={(v) => {
              setGuestInput(v);
              setGuestNames(v ? [v] : []);
            }}
          />
          {guestNames[0] ? (
            <Text className="text-[11px] text-sub mt-1">{guestNames[0]}</Text>
          ) : null}
        </Card>

        {/* Payment Method Selection */}
        <Card variant="elevated" className="mt-4">
          <Text className="text-sm font-bold text-ink mb-3">{t('wallet.title')}</Text>
          <View className="gap-2">
            <Pressable
              onPress={() => setPaymentRail('wallet_irr')}
              className={`p-3 rounded-xl border flex-row items-center justify-between ${
                paymentRail === 'wallet_irr' ? 'border-brand bg-mint/10' : 'border-slate-200 bg-surface'
              }`}
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-brand/10 items-center justify-center mr-3">
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.brand} strokeWidth={2}>
                    <Path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                    <Path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                    <Path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  </Svg>
                </View>
                <View>
                  <Text className="text-sm font-bold text-ink">NewCash Wallet</Text>
                  <Text className="text-[11px] text-sub">Instant zero-fee settlement</Text>
                </View>
              </View>
              <View className={`w-4 h-4 rounded-full border items-center justify-center ${paymentRail === 'wallet_irr' ? 'border-brand' : 'border-slate-300'}`}>
                {paymentRail === 'wallet_irr' && <View className="w-2 h-2 rounded-full bg-brand" />}
              </View>
            </Pressable>

            <Pressable
              onPress={() => setPaymentRail('gateway_shetab')}
              className={`p-3 rounded-xl border flex-row items-center justify-between ${
                paymentRail === 'gateway_shetab' ? 'border-brand bg-mint/10' : 'border-slate-200 bg-surface'
              }`}
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center mr-3">
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2}>
                    <Path d="M2 10h20M2 14h20M2 6h20v12H2z" />
                  </Svg>
                </View>
                <View>
                  <Text className="text-sm font-bold text-ink">Shetab Cards</Text>
                  <Text className="text-[11px] text-sub">All Iranian bank cards via Shaparak</Text>
                </View>
              </View>
              <View className={`w-4 h-4 rounded-full border items-center justify-center ${paymentRail === 'gateway_shetab' ? 'border-brand' : 'border-slate-300'}`}>
                {paymentRail === 'gateway_shetab' && <View className="w-2 h-2 rounded-full bg-brand" />}
              </View>
            </Pressable>

            <Pressable
              onPress={() => setPaymentRail('gateway_ecardo')}
              className={`p-3 rounded-xl border flex-row items-center justify-between ${
                paymentRail === 'gateway_ecardo' ? 'border-brand bg-mint/10' : 'border-slate-200 bg-surface'
              }`}
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center mr-3">
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.action} strokeWidth={2}>
                    <Path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A4 4 0 0 1 8 13h2a2 2 0 1 0 4 0c0-1.5-1.5-2-3-2.5S8 9 8 7a4 4 0 0 1 3-3.93V3a1 1 0 0 1 2 0v.07A4 4 0 0 1 16 7h-2a2 2 0 0 0-4 0c0 1.5 1.5 2 3 2.5s3 1.5 3 3.5a4 4 0 0 1-3 3.93z" />
                  </Svg>
                </View>
                <View>
                  <Text className="text-sm font-bold text-ink">International (eCardo)</Text>
                  <Text className="text-[11px] text-sub">Visa / Mastercard / USDT / WeChat</Text>
                </View>
              </View>
              <View className={`w-4 h-4 rounded-full border items-center justify-center ${paymentRail === 'gateway_ecardo' ? 'border-brand' : 'border-slate-300'}`}>
                {paymentRail === 'gateway_ecardo' && <View className="w-2 h-2 rounded-full bg-brand" />}
              </View>
            </Pressable>
          </View>
        </Card>

        {/* Fare breakdown */}
        <Card variant="elevated" className="mt-4">
          <Text className="text-sm font-bold text-ink mb-3">{t('booking.fareBreakdown')}</Text>
          <Row label={`${t('hotel.nightlyRate')} × ${n} × ${draft.rooms}`} amount={breakdown.base} />
          <Row label={t('booking.tax')} amount={breakdown.tax} />
          <Row label={t('booking.serviceFee')} amount={breakdown.serviceFee} />
          <View className="flex-row items-center justify-between pt-3 mt-1 border-t border-slate-200">
            <Text className="text-sm font-bold text-ink">{t('booking.total')}</Text>
            <Text className="text-lg font-bold text-price" style={{ writingDirection: 'ltr' }}>
              {breakdown.total.amount.toFixed(2)} {breakdown.total.currency}
            </Text>
          </View>
        </Card>

        {lastError ? (
          <View className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
            <Text className="text-xs text-rose font-medium">{lastError}</Text>
          </View>
        ) : null}

        {!isOnline ? (
          <Card variant="flat" className="mt-4 items-center">
            <Text className="text-xs text-rose text-center">{t('common.offline')}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {/* Sticky checkout bar */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-surface border-t border-slate-200 px-5 pt-3 pb-2"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs text-sub">{t('booking.total')}</Text>
          <Text className="text-base font-bold text-price" style={{ writingDirection: 'ltr' }}>
            {breakdown.total.amount.toFixed(2)} {breakdown.total.currency}
          </Text>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button variant="outline" title={t('booking.cancelBooking')} onPress={onCancel} disabled={processing || isSubmitting} />
          </View>
          <View className="flex-[2]">
            {processing || isSubmitting ? (
              <View className="py-3 items-center justify-center">
                <ActivityIndicator size="small" color={colors.brand} />
              </View>
            ) : (
              <Button
                variant="action"
                title={t('booking.payNow')}
                onPress={onPay}
                disabled={!isOnline}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function Row({
  label,
  amount,
}: {
  label: string;
  amount: { amount: { toFixed: (d: number) => string }; currency: string };
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-xs text-sub">{label}</Text>
      <Text className="text-xs text-ink" style={{ writingDirection: 'ltr' }}>
        {amount.amount.toFixed(2)} {amount.currency}
      </Text>
    </View>
  );
}
