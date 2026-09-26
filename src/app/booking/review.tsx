import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useVaultStore } from '@/stores/vaultStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { flightVoucherFromDraft } from '@/domains/voucher/voucher';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { colors } from '@/styles/colors';

/**
 * Review & checkout screen — Phase 2 booking funnel step 3 (final).
 *
 * Shows the priced draft (base/tax/serviceFee/total from the pricing
 * engine), the passenger manifest and the offer details. Checkout marks
 * the FSM transition server-side in production; here the store's
 * confirm()/cancel() guards keep the lifecycle consistent with the
 * server (which remains the Source of Truth).
 */
export default function ReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const authState = useAuthStore((s) => s.auth);
  const draft = useBookingStore((s) => s.draft);
  const confirm = useBookingStore((s) => s.confirm);
  const cancel = useBookingStore((s) => s.cancel);
  const reset = useBookingStore((s) => s.reset);
  const draftTotalIn = useBookingStore((s) => s.draftTotalIn);
  const debit = useWalletStore((s) => s.debit);
  const [paying, setPaying] = useState(false);

  const seg = draft.offer?.segments[0];

  const irrEquivalent = useMemo(() => {
    if (draft.offer?.priceCurrency !== 'USD') return null;
    return draftTotalIn('IRR', useWalletStore.getState().usdIrrRate.toString());
  }, [draft.offer?.priceCurrency, draftTotalIn]);

  const onPay = () => {
    if (authState.state !== 'authenticated') {
      router.push('/(auth)/login');
      return;
    }
    if (!draft.breakdown || !draft.offer) return;

    Alert.alert(t('booking.reviewTitle'), t('booking.payConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('booking.payNow'),
        style: 'default',
        onPress: () => {
          setPaying(true);
          try {
            markCheckoutAndConfirm();
          } catch (e) {
            setPaying(false);
            Alert.alert(t('common.error'), String((e as Error).message ?? e));
          }
        },
      },
    ]);
  };

  const markCheckoutAndConfirm = () => {
    // Simulated server round-trip: wallet settles the total in offer currency.
    // debit() records the signed transaction; confirm() enforces the FSM.
    const bd = draft.breakdown;
    if (!bd) return;
    debit(bd.total, {
      id: `tx-${Date.now()}`,
      title: seg ? `${seg.airlineCode} · ${seg.flightNumber}` : t('booking.reviewTitle'),
      date: new Date().toISOString(),
      category: 'flight',
    });
    confirm();

    // Persist the offline voucher (digital pass) for airplane-mode access.
    if (draft.offer && draft.search) {
      const voucher = flightVoucherFromDraft({
        bookingRef: `ITR-${Date.now().toString(36).toUpperCase()}`,
        offer: draft.offer,
        search: draft.search,
        passengers: draft.passengers,
        total: bd.total,
      });
      void useVaultStore.getState().addFlightVoucher(voucher);
    }

    setPaying(false);
    resetAfterSuccess();
  };

  const resetAfterSuccess = () => {
    Alert.alert(t('booking.successTitle'), t('booking.successBody'), [
      { text: t('common.ok'), onPress: () => router.replace('/(tabs)/my-trips' as never) },
    ]);
    // Keep the confirmed draft visible for the success summary, then clear.
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

  if (!draft.offer || !draft.breakdown) {
    return (
      <View
        className="flex-1 bg-soft items-center justify-center"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Text className="text-sm text-sub">{t('booking.noDraft')}</Text>
        <View className="mt-4">
          <Button variant="outline" title={t('search.searchFlights')} onPress={() => router.replace('/booking/results')} />
        </View>
      </View>
    );
  }

  const { breakdown } = draft;

  return (
    <View className="flex-1 bg-soft" style={{ paddingTop: insets.top }}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140 }}>
        <Text className="text-2xl font-bold text-ink">{t('booking.reviewTitle')}</Text>

        {/* Offer summary */}
        <Card variant="elevated" className="mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Badge label={seg ? `${seg.airlineCode} · ${seg.flightNumber}` : ''} variant="brand" size="sm" />
            <Badge label={draft.status} variant={draft.status === 'CONFIRMED' ? 'success' : 'warning'} size="sm" />
          </View>
          <View className="flex-row items-center justify-between py-2">
            <View className="items-start">
              <Text className="text-xl font-bold text-ink">{draft.search?.origin ?? '—'}</Text>
              <Text className="text-[11px] text-sub">{seg?.departureTime.slice(11, 16)}</Text>
            </View>
            <Text className="text-[11px] text-sub px-3">{seg?.durationMinutes}m</Text>
            <View className="items-end">
              <Text className="text-xl font-bold text-ink">{draft.search?.destination ?? '—'}</Text>
              <Text className="text-[11px] text-sub">{seg?.arrivalTime.slice(11, 16)}</Text>
            </View>
          </View>
          <Text className="text-[11px] text-sub mt-1">
            {draft.search?.departDate} · {draft.search?.adults} pax
          </Text>
        </Card>

        {/* Passengers */}
        <Card variant="elevated" className="mt-4">
          <Text className="text-sm font-bold text-ink mb-2">{t('booking.passengersTitle')}</Text>
          {draft.passengers.map((p) => (
            <View key={p.id} className="flex-row items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-ink" style={{ writingDirection: 'ltr' }}>
                  {p.firstNameLatin} {p.lastNameLatin}
                </Text>
                <Text className="text-[11px] text-sub" style={{ writingDirection: 'ltr' }}>
                  {p.passport.nationality} · {p.passport.number}
                </Text>
              </View>
              <Badge label={p.type} variant="neutral" size="sm" />
            </View>
          ))}
        </Card>

        {/* Fare breakdown */}
        <Card variant="elevated" className="mt-4">
          <Text className="text-sm font-bold text-ink mb-3">{t('booking.fareBreakdown')}</Text>
          <Row label={t('booking.baseFare')} amount={breakdown.base} />
          <Row label={t('booking.tax')} amount={breakdown.tax} />
          <Row label={t('booking.serviceFee')} amount={breakdown.serviceFee} />
          <View className="flex-row items-center justify-between pt-3 mt-1 border-t border-slate-200">
            <Text className="text-sm font-bold text-ink">{t('booking.total')}</Text>
            <Text className="text-lg font-bold text-price" style={{ writingDirection: 'ltr' }}>
              {breakdown.total.amount.toFixed(2)} {breakdown.total.currency}
            </Text>
          </View>
          {irrEquivalent ? (
            <Text className="text-[11px] text-sub mt-1" style={{ writingDirection: 'ltr' }}>
              ≈ {irrEquivalent.amount.toFixed(0)} IRR
            </Text>
          ) : null}
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
              <Button variant="action" title={t('booking.payNow')} onPress={onPay} disabled={!isOnline} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function Row({ label, amount }: { label: string; amount: { amount: { toFixed: (d: number) => string }; currency: string } }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-xs text-sub">{label}</Text>
      <Text className="text-xs text-ink" style={{ writingDirection: 'ltr' }}>
        {amount.amount.toFixed(2)} {amount.currency}
      </Text>
    </View>
  );
}
