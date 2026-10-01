import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useVaultStore } from '@/stores/vaultStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { bookingService } from '@/services/api';
import { flightVoucherFromDraft } from '@/domains/voucher/voucher';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { colors } from '@/styles/colors';

type PaymentRail = 'wallet_irr' | 'gateway_shetab' | 'gateway_ecardo';

/**
 * Review & checkout screen — Phase 3 & 4 Server-Authoritative Booking Funnel.
 *
 * Implements:
 * 1. Server quote validation before checkout (detects price changes).
 * 2. Multi-rail payment selection: NewCash Wallet, Shetab Cards, eCardo International.
 * 3. Server draft hold creation (with soft-lock inventory).
 * 4. Server-authoritative payment capture & atomic ledger posting.
 * 5. Direct navigation to Booking Confirmation screen & offline vault sync.
 */
export default function ReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const authState = useAuthStore((s) => s.auth);
  const draft = useBookingStore((s) => s.draft);
  const isSubmitting = useBookingStore((s) => s.isSubmitting);
  const lastError = useBookingStore((s) => s.lastError);
  const createAuthoritativeDraft = useBookingStore((s) => s.createAuthoritativeDraft);
  const confirmAuthoritativePayment = useBookingStore((s) => s.confirmAuthoritativePayment);
  const cancel = useBookingStore((s) => s.cancel);
  const reset = useBookingStore((s) => s.reset);
  const draftTotalIn = useBookingStore((s) => s.draftTotalIn);

  const [paymentRail, setPaymentRail] = useState<PaymentRail>('wallet_irr');
  const [processing, setProcessing] = useState(false);

  const seg = draft.offer?.segments[0];

  const irrEquivalent = useMemo(() => {
    if (draft.offer?.priceCurrency !== 'USD') return null;
    return draftTotalIn('IRR', useWalletStore.getState().usdIrrRate.toString());
  }, [draft.offer?.priceCurrency, draftTotalIn]);

  const onPay = async () => {
    if (authState.state !== 'authenticated') {
      router.push('/(auth)/login');
      return;
    }
    if (!draft.breakdown || !draft.offer || !draft.search) return;

    setProcessing(true);
    try {
      // 1. Validate quote freshness with server
      const quoteCheck = await bookingService.validateQuote({
        type: 'FLIGHT',
        itemId: draft.offer.id,
        expectedAmount: draft.breakdown.total.amount.toFixed(2),
        expectedCurrency: draft.breakdown.total.currency,
      });

      if (!quoteCheck.valid || quoteCheck.priceMismatch) {
        setProcessing(false);
        Alert.alert(
          t('common.error'),
          `Price updated by supplier to ${quoteCheck.serverAmount} ${quoteCheck.serverCurrency}. Please review.`,
        );
        return;
      }

      // 2. Create authoritative server booking draft with soft lock.
      // A verified phone is required — never fabricate a placeholder number.
      const userPhone = authState.phone?.trim();
      if (!userPhone) {
        setProcessing(false);
        Alert.alert(
          t('common.error'),
          t('booking.phoneRequired'),
        );
        return;
      }
      const draftResult = await createAuthoritativeDraft(userPhone);

      // 3. Confirm payment on backend
      const payResult = await confirmAuthoritativePayment(paymentRail);

      if (!payResult.success) {
        setProcessing(false);
        if (payResult.outcome === 'UNKNOWN') {
          // Anti-double-charge: the server may still capture. The user must
          // verify the booking status — re-submitting payment blindly is
          // exactly how duplicate charges happen. Poll the authoritative
          // booking state; if it already confirms, treat as success.
          const bookingId = draft.bookingId;
          const verified = bookingId ? await bookingService.getBooking(bookingId) : null;
          if (verified?.status === 'CONFIRMED') {
            // Payment actually captured AND the booking is confirmed —
            // only now may a voucher enter the offline vault.
            const bookingRef = verified.reference || draftResult.reference;
            const verifiedPnr =
              (verified.voucher as { pnr?: string } | undefined)?.pnr ?? '';
            const voucher = flightVoucherFromDraft({
              bookingRef,
              offer: draft.offer,
              search: draft.search,
              passengers: draft.passengers,
              total: draft.breakdown.total,
            });
            await useVaultStore.getState().addFlightVoucher(voucher);
            void useWalletStore.getState().syncWithServer();
            setProcessing(false);
            router.replace({
              pathname: '/booking/confirmation' as never,
              params: {
                bookingRef,
                pnr: verifiedPnr,
                title: `${seg?.airlineCode} ${seg?.flightNumber}`,
                origin: draft.search.origin,
                destination: draft.search.destination,
                date: draft.search.departDate,
                totalAmount: draft.breakdown.total.amount.toFixed(2),
                currency: draft.breakdown.total.currency,
                kind: 'flight',
              },
            });
            return;
          }
          // PAYMENT_CONFIRMED (or still pending): the capture went through
          // but supplier confirmation is in flight — the FSM allows
          // PAYMENT_CONFIRMED → CANCELLED, so no voucher is minted yet.
          void useWalletStore.getState().syncWithServer();
          Alert.alert(
            t('common.error'),
            t('booking.paymentPendingVerify'),
          );
          return;
        }
        if (payResult.outcome === 'REDIRECT_REQUIRED' && payResult.redirectUrl) {
          // 3DS / bank redirect flow — open the redirect and pause checkout.
          const url = payResult.redirectUrl;
          const { Linking } = await import('react-native');
          try {
            await Linking.openURL(url);
          } catch {
            // Redirect blocked — surface the URL in the alert instead.
          }
          Alert.alert(
            t('common.error'),
            t('booking.redirectRequired'),
          );
          return;
        }
        Alert.alert(t('common.error'), payResult.error || 'Payment declined by server');
        return;
      }

      // 4. Save confirmed voucher to local offline vault.
      // The reference is server-issued (createDraft guarantees it); nothing
      // is fabricated locally.
      const bookingRef = draftResult.reference || draft.serverReference;
      if (!bookingRef) throw new Error('Server booking reference missing');
      const voucher = flightVoucherFromDraft({
        bookingRef,
        offer: draft.offer,
        search: draft.search,
        passengers: draft.passengers,
        total: draft.breakdown.total,
      });
      await useVaultStore.getState().addFlightVoucher(voucher);

      // 5. Sync wallet balance with server
      void useWalletStore.getState().syncWithServer();

      setProcessing(false);

      // 6. Navigate to dedicated Confirmation Screen. A PNR may legitimately
      // be absent right after capture (issuance pending) — no fabrication.
      router.replace({
        pathname: '/booking/confirmation' as never,
        params: {
          bookingRef,
          pnr: payResult.pnr ?? '',
          title: `${seg?.airlineCode} ${seg?.flightNumber}`,
          origin: draft.search.origin,
          destination: draft.search.destination,
          date: draft.search.departDate,
          totalAmount: draft.breakdown.total.amount.toFixed(2),
          currency: draft.breakdown.total.currency,
          kind: 'flight',
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 160 }}>
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
              <View className="flex-1 pe-3">
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
                <View className="w-8 h-8 rounded-lg bg-brand/10 items-center justify-center me-3">
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
                <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center me-3">
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
                <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center me-3">
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
