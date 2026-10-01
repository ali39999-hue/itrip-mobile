import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWalletStore } from '@/stores/walletStore';
import { useAuthStore } from '@/stores/authStore';
import { useBiometrics } from '@/hooks/useBiometrics';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { format, money } from '@/domains/currency/money';
import { walletService } from '@/services/api';

type TopUpRail = 'shetab' | 'ecardo_card' | 'ecardo_crypto';

const RAIL_LABEL_KEYS: Record<TopUpRail, string> = {
  shetab: 'wallet.railShetab',
  ecardo_card: 'wallet.railCard',
  ecardo_crypto: 'wallet.railCrypto',
};

export default function WalletScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const auth = useAuthStore((s) => s.auth);
  const {
    balances,
    transactions,
    irrEquivalent,
    setUnlocked,
    unlocked,
    syncWithServer,
    isSyncing,
    lastSyncedAt,
    loyaltyPoints,
    loyaltyTier,
    credit,
  } = useWalletStore();
  const { authenticate, hasHardware, isEnrolled } = useBiometrics();
  const { isOnline } = useNetworkStatus();
  const [unlocking, setUnlocking] = useState(false);

  // Modals
  const [topUpModal, setTopUpModal] = useState(false);
  const [convertModal, setConvertModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('100');
  const [topUpRail, setTopUpRail] = useState<'shetab' | 'ecardo_card' | 'ecardo_crypto'>('shetab');
  const [isTopUpProcessing, setIsTopUpProcessing] = useState(false);

  const isGuest = auth.state !== 'authenticated';

  // Biometric gate: wallet requires biometric/PIN prompt before revealing data
  useEffect(() => {
    if (isGuest || unlocked || unlocking || !hasHardware || !isEnrolled) return;
    setUnlocking(true);
    void authenticate(t('wallet.title')).then((ok) => {
      setUnlocked(ok);
      setUnlocking(false);
    });
  }, [authenticate, isEnrolled, isGuest, hasHardware, setUnlocked, t, unlocking, unlocked]);

  // Initial sync when authenticated and online
  useEffect(() => {
    if (!isGuest && isOnline) {
      void syncWithServer();
    }
  }, [isGuest, isOnline, syncWithServer]);

  const onRefresh = useCallback(() => {
    void syncWithServer();
  }, [syncWithServer]);

  const usd = balances?.USD;
  const irr = irrEquivalent();

  const retryUnlock = () => {
    setUnlocking(true);
    void authenticate(t('wallet.title')).then((ok) => {
      setUnlocked(ok);
      setUnlocking(false);
    });
  };

  const handleTopUpSubmit = async () => {
    const num = parseFloat(topUpAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert(t('common.error'), t('wallet.invalidAmount'));
      return;
    }
    // R6 anti-double-submit: one in-flight top-up per screen instance.
    // The button is also disabled while processing, but state guards the
    // race where two taps land before the first re-render.
    if (isTopUpProcessing) return;

    setIsTopUpProcessing(true);
    const idempotencyKey = `topup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      const res = await walletService.initiateTopUp({
        amount: topUpAmount,
        currency: 'USD',
        method: topUpRail,
        idempotencyKey,
      });

      setIsTopUpProcessing(false);
      setTopUpModal(false);

      if (res.success) {
        // R6: an intent is NOT money in the wallet. Record it as PENDING —
        // the server ledger confirms the SETTLED row on the next sync.
        credit(money(topUpAmount, 'USD'), {
          id: res.intentId || `tx-${Date.now()}`,
          title: t('wallet.topUpTxTitle', { rail: t(RAIL_LABEL_KEYS[topUpRail]) }),
          date: new Date().toISOString(),
          category: 'topup',
          status: 'PENDING',
        });
        Alert.alert(t('wallet.topUpInitiatedTitle'), t('wallet.topUpPending', { amount: topUpAmount }));
        void syncWithServer();
      } else {
        Alert.alert(t('common.error'), res.error || t('wallet.topUpFailed'));
      }
    } catch (e: unknown) {
      setIsTopUpProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('common.error'), msg);
    }
  };

  if (isGuest) {
    return (
      <View
        className="flex-1 bg-soft items-center justify-center px-8"
        style={{ paddingBottom: insets.bottom }}
      >
        <View className="w-16 h-16 rounded-full bg-brand/10 items-center justify-center mb-4">
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.brand} strokeWidth={2}>
            <Path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <Path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <Path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </Svg>
        </View>
        <Text className="text-xl font-bold text-ink">{t('wallet.title')}</Text>
        <Text className="mt-2 text-center text-sm text-sub">{t('wallet.subtitle')}</Text>
        <View className="mt-6 w-full max-w-xs">
          <Button
            variant="action"
            size="lg"
            title={t('auth.loginAction')}
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </View>
    );
  }

  if (unlocking || (!unlocked && hasHardware && isEnrolled)) {
    return (
      <View
        className="flex-1 bg-soft items-center justify-center px-8"
        style={{ paddingBottom: insets.bottom }}
      >
        <ActivityIndicator size="large" color={colors.brand} />
        <Text className="mt-4 text-sm text-sub">{t('account.biometrics')}</Text>
        {!unlocking ? (
          <View className="mt-6">
            <Button title={t('common.retry')} onPress={retryUnlock} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-soft"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isSyncing} onRefresh={onRefresh} colors={[colors.brand]} />
      }
    >
      <View className="flex-row items-center justify-between px-5 mb-4">
        <View>
          <Text className="text-2xl font-bold text-ink">{t('wallet.title')}</Text>
          <Text className="text-xs text-sub mt-0.5">{t('wallet.subtitle')}</Text>
        </View>
        <Badge
          label={`${loyaltyTier} · ${t('account.loyaltyPoints', { points: loyaltyPoints })}`}
          variant="brand"
          size="sm"
        />
      </View>

      <OfflineBanner />

      {/* Main Balance Card */}
      <View className="px-5 mb-5">
        <View className="rounded-3xl bg-slate-900 p-6 shadow-sm">
          {usd ? (
            <>
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-xs font-semibold text-slate-400">{t('wallet.newcashBalance')}</Text>
                  <Text
                    className="text-3xl font-bold text-white mt-1"
                    style={{ writingDirection: 'ltr' }}
                  >
                    ${usd.amount.toFixed(2)}
                  </Text>
                  {lastSyncedAt ? (
                    <Text className="text-[10px] text-slate-400 mt-1">
                      {t('wallet.lastSynced', { time: new Date(lastSyncedAt).toLocaleTimeString() })}
                    </Text>
                  ) : null}
                </View>
                <Badge label={t('wallet.newcashVerified')} variant="brand" className="bg-teal-500/20 text-teal-300" />
              </View>

              {irr ? (
                <View className="rounded-xl bg-slate-800/80 p-3 mb-5 border border-slate-700/50">
                  <Text className="text-[11px] text-slate-400">{t('wallet.equivalentRial')}</Text>
                  <Text
                    className="text-base font-bold text-action mt-0.5"
                    style={{ writingDirection: 'ltr' }}
                  >
                    {format(irr, 'en-US')}
                  </Text>
                </View>
              ) : null}

              {/* Quick Action Buttons */}
              <View className="flex-row justify-between">
                <Pressable
                  onPress={() => setTopUpModal(true)}
                  className="flex-1 items-center bg-brand rounded-xl py-3 me-2 active:opacity-90"
                >
                  <Text className="text-sm font-semibold text-white">{t('wallet.charge')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setConvertModal(true)}
                  className="flex-1 items-center bg-slate-800 border border-slate-700 rounded-xl py-3 me-2 active:opacity-90"
                >
                  <Text className="text-sm font-semibold text-white">{t('wallet.convert')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/sos')}
                  className="flex-1 items-center bg-slate-800 border border-slate-700 rounded-xl py-3 active:opacity-90"
                >
                  <Text className="text-sm font-semibold text-action">{t('wallet.scanPay')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View className="items-center py-2">
              <Text className="text-xs font-semibold text-slate-400 mb-1">{t('wallet.newcashBalance')}</Text>
              <Text className="text-xl font-bold text-white mb-2">
                {isSyncing ? t('wallet.syncingLedger') : t('wallet.balanceUnavailable')}
              </Text>
              <Text className="text-xs text-slate-400 text-center mb-4">
                {t('wallet.balanceOfflineHint')}
              </Text>
              <Button
                variant="action"
                size="md"
                title={isSyncing ? t('wallet.syncing') : t('wallet.syncNow')}
                onPress={syncWithServer}
                disabled={isSyncing || !isOnline}
              />
            </View>
          )}
        </View>
      </View>

      {/* Tourist Physical Debit Card Teaser */}
      <View className="px-5 mb-6">
        <Text className="text-base font-bold text-ink mb-3">{t('wallet.myCards')}</Text>

        <Card variant="mint" className="p-5 border-teal-200">
          <View className="flex-row items-center justify-between mb-3">
            <Badge label={t('wallet.cardIssued')} variant="brand" size="sm" />
            <Text className="text-xs font-bold text-brand-dark">{t('wallet.shetabNetwork')}</Text>
          </View>

          <Text
            className="text-lg font-mono font-bold text-ink tracking-wider mb-2"
            style={{ writingDirection: 'ltr' }}
          >
            6037 ···· ···· 8841
          </Text>

          <View className="flex-row justify-between items-center pt-2 border-t border-teal-200/60">
            <Text className="text-xs text-sub">{t('wallet.expiry')}: 1406/08</Text>
            <Text className="text-xs text-sub">{t('wallet.cvv2')}: ···</Text>
            {!isOnline ? (
              <Badge label={t('common.offline')} variant="warning" size="sm" />
            ) : null}
          </View>
        </Card>
      </View>

      {/* Recent Transactions List */}
      <View className="px-5">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-ink">{t('wallet.transactions')}</Text>
          {lastSyncedAt ? (
            <Text className="text-[10px] text-sub">
              {t('wallet.lastSynced', { time: new Date(lastSyncedAt).toLocaleTimeString() })}
            </Text>
          ) : null}
        </View>

        {transactions.length === 0 ? (
          <EmptyState
            title={t('wallet.noTransactions')}
            description={t('wallet.transactionsHint')}
          />
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.amount.amount.isPositive();
            return (
              <Card
                key={tx.id}
                variant="flat"
                className="flex-row items-center justify-between mb-2.5 bg-surface border border-slate-100"
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center me-3 ${
                      isCredit ? 'bg-emerald-50' : 'bg-slate-100'
                    }`}
                  >
                    <Svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isCredit ? colors.success : colors.sub}
                      strokeWidth={2}
                    >
                      {isCredit ? <Path d="M12 19V5M5 12l7-7 7 7" /> : <Path d="M12 5v14M19 12l-7 7-7-7" />}
                    </Svg>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-ink">{tx.title}</Text>
                    <Text className="text-[11px] text-sub mt-0.5">{tx.date.slice(0, 10)}</Text>
                  </View>
                </View>

                <Text
                  className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-ink'}`}
                  style={{ writingDirection: 'ltr' }}
                >
                  {isCredit ? '+' : '-'}
                  {tx.amount.amount.abs().toFixed(2)} {tx.amount.currency}
                </Text>
              </Card>
            );
          })
        )}
      </View>

      {/* Top-up Modal */}
      <Modal visible={topUpModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-surface rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-ink">{t('wallet.charge')}</Text>
              <Pressable onPress={() => setTopUpModal(false)}>
                <Text className="text-sm font-semibold text-sub">{t('common.cancel')}</Text>
              </Pressable>
            </View>

            <Text className="text-xs text-sub mb-2">{t('wallet.selectAmount')}</Text>
            <View className="flex-row gap-2 mb-4">
              {['50', '100', '250', '500'].map((amt) => (
                <Pressable
                  key={amt}
                  onPress={() => setTopUpAmount(amt)}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    topUpAmount === amt ? 'border-brand bg-brand/10' : 'border-slate-200'
                  }`}
                >
                  <Text className={`font-bold ${topUpAmount === amt ? 'text-brand' : 'text-ink'}`}>${amt}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-xs text-sub mb-2">{t('wallet.paymentMethod')}</Text>
            <View className="gap-2 mb-6">
              {[
                { id: 'shetab' as const, label: t('wallet.railShetab'), desc: t('wallet.railShetabDesc') },
                { id: 'ecardo_card' as const, label: t('wallet.railCard'), desc: t('wallet.railCardDesc') },
                { id: 'ecardo_crypto' as const, label: t('wallet.railCrypto'), desc: t('wallet.railCryptoDesc') },
              ].map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setTopUpRail(m.id)}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    topUpRail === m.id ? 'border-brand bg-mint/10' : 'border-slate-200'
                  }`}
                >
                  <View>
                    <Text className="text-sm font-bold text-ink">{m.label}</Text>
                    <Text className="text-[11px] text-sub">{m.desc}</Text>
                  </View>
                  <View className={`w-4 h-4 rounded-full border items-center justify-center ${topUpRail === m.id ? 'border-brand' : 'border-slate-300'}`}>
                    {topUpRail === m.id && <View className="w-2 h-2 rounded-full bg-brand" />}
                  </View>
                </Pressable>
              ))}
            </View>

            <Button
              variant="action"
              size="lg"
              title={isTopUpProcessing ? t('wallet.processing') : t('wallet.payAmount', { amount: topUpAmount })}
              onPress={handleTopUpSubmit}
              disabled={isTopUpProcessing || !isOnline}
            />
          </View>
        </View>
      </Modal>

      {/* FX Conversion Modal */}
      <Modal visible={convertModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-surface rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-ink">{t('wallet.convert')}</Text>
              <Pressable onPress={() => setConvertModal(false)}>
                <Text className="text-sm font-semibold text-sub">{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <View className="p-4 rounded-2xl bg-soft border border-slate-100 mb-4">
              <Text className="text-xs text-sub mb-1">{t('wallet.referenceRate')}</Text>
              <Text
                className="text-xl font-bold text-ink"
                style={{ writingDirection: 'ltr' }}
              >
                {t('wallet.usdIrrRate', { rate: useWalletStore.getState().usdIrrRate.toString() })}
              </Text>
            </View>
            <Button
              variant="action"
              size="md"
              title={t('wallet.openSosTool')}
              onPress={() => {
                setConvertModal(false);
                router.push('/sos');
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
