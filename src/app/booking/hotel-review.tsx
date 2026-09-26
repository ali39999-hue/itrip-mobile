import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useHotelStore } from '@/stores/hotelStore';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useVaultStore } from '@/stores/vaultStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { HotelVoucher } from '@/domains/voucher/voucher';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { colors } from '@/styles/colors';

/**
 * Hotel review & checkout — confirms the stay, debits NewCash, and writes
 * a HotelVoucher to the offline vault (Driver Card payload included).
 *
 * The voucher carries the Persian address/name so the Driver Card in
 * My Trips works fully offline at the taxi rank.
 */
export default function HotelReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const authState = useAuthStore((s) => s.auth);
  const draft = useHotelStore((s) => s.draft);
  const nights = useHotelStore((s) => s.nights);
  const confirm = useHotelStore((s) => s.confirm);
  const cancel = useHotelStore((s) => s.cancel);
  const reset = useHotelStore((s) => s.reset);
  const guestNames = useHotelStore((s) => s.guestNames);
  const setGuestNames = useHotelStore((s) => s.setGuestNames);
  const debit = useWalletStore((s) => s.debit);
  const addHotelVoucher = useVaultStore((s) => s.addHotelVoucher);

  const [paying, setPaying] = useState(false);
  const [guestInput, setGuestInput] = useState('');

  const offer = draft.offer;
  const breakdown = draft.breakdown;
  const search = draft.search;

  const onPay = () => {
    if (authState.state !== 'authenticated') {
      router.push('/(auth)/login');
      return;
    }
    if (!offer || !breakdown || !search) return;

    Alert.alert(t('booking.reviewTitle'), t('booking.payConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('booking.payNow'),
        style: 'default',
        onPress: () => {
          setPaying(true);
          try {
            doPay();
          } catch (e) {
            setPaying(false);
            Alert.alert(t('common.error'), String((e as Error).message ?? e));
          }
        },
      },
    ]);
  };

  const doPay = () => {
    if (!offer || !breakdown || !search) return;
    const n = nights();

    debit(breakdown.total, {
      id: `tx-hotel-${Date.now()}`,
      title: `${offer.hotel.name} · ${n} nights`,
      date: new Date().toISOString(),
      category: 'hotel',
    });
    confirm();

    const bookingRef = `ITR-H${Date.now().toString(36).toUpperCase()}`;
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
    void addHotelVoucher(voucher);

    setPaying(false);
    Alert.alert(t('booking.successTitle'), t('booking.successBody'), [
      { text: t('common.ok'), onPress: () => router.replace('/(tabs)/my-trips') },
    ]);
    setTimeout(() => reset(), 500);
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140 }}>
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

        {/* Lead guest name (hotel check-in doesn't need passports) */}
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
            <Button variant="outline" title={t('booking.cancelBooking')} onPress={onCancel} />
          </View>
          <View className="flex-[2]">
            {paying ? (
              <ActivityIndicator size="small" color={colors.brand} />
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
