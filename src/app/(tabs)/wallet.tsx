import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useWalletStore } from '@/stores/walletStore';
import { useAuthStore } from '@/stores/authStore';
import { useBiometrics } from '@/hooks/useBiometrics';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { format } from '@/domains/currency/money';

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
  } = useWalletStore();
  const { authenticate, hasHardware, isEnrolled } = useBiometrics();
  const { isOnline } = useNetworkStatus();
  const [unlocking, setUnlocking] = useState(false);

  const isGuest = auth.state !== 'authenticated';

  // Biometric gate: wallet requires biometric/PIN prompt before revealing data
  // (only when the device actually supports it; otherwise fall back open).
  useEffect(() => {
    if (isGuest || unlocked || unlocking || !hasHardware || !isEnrolled) return;
    setUnlocking(true);
    void authenticate(t('wallet.title')).then((ok) => {
      setUnlocked(ok);
      setUnlocking(false);
    });
  }, [authenticate, isEnrolled, isGuest, hasHardware, setUnlocked, t, unlocking, unlocked]);

  const usd = balances.USD;
  const irr = irrEquivalent();

  const retryUnlock = () => {
    setUnlocking(true);
    void authenticate(t('wallet.title')).then((ok) => {
      setUnlocked(ok);
      setUnlocking(false);
    });
  };

  if (isGuest) {
    return (
      <View
        className="flex-1 bg-soft items-center justify-center px-8"
        style={{ paddingBottom: insets.bottom }}
      >
        <Text className="text-lg font-semibold text-ink">{t('wallet.title')}</Text>
        <Text className="mt-2 text-center text-sm text-sub">{t('wallet.subtitle')}</Text>
        <View className="mt-6 w-full max-w-xs">
          <Button title={t('auth.loginAction')} onPress={() => undefined} disabled />
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
    >
      <View className="px-5 mb-4">
        <Text className="text-2xl font-bold text-ink">{t('wallet.title')}</Text>
        <Text className="text-xs text-sub mt-0.5">{t('wallet.subtitle')}</Text>
      </View>

      <OfflineBanner />

      {/* Main Balance Card */}
      <View className="px-5 mb-5">
        <View className="rounded-3xl bg-slate-900 p-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xs font-semibold text-slate-400">{t('wallet.newcashBalance')}</Text>
              <Text className="text-3xl font-bold text-white mt-1">
                ${usd.amount.toFixed(2)}
              </Text>
            </View>
            <Badge label="NewCash Verified" variant="brand" className="bg-teal-500/20 text-teal-300" />
          </View>

          <View className="rounded-xl bg-slate-800/80 p-3 mb-5 border border-slate-700/50">
            <Text className="text-[11px] text-slate-400">{t('wallet.equivalentRial')}</Text>
            <Text
              className="text-base font-bold text-action mt-0.5"
              style={{ writingDirection: 'ltr' }}
            >
              {format(irr, 'en-US')}
            </Text>
          </View>

          {/* Quick Action Buttons */}
          <View className="flex-row justify-between">
            <Pressable className="flex-1 items-center bg-brand rounded-xl py-3 mr-2 active:opacity-90">
              <Text className="text-sm font-semibold text-white">{t('wallet.charge')}</Text>
            </Pressable>
            <Pressable className="flex-1 items-center bg-slate-800 border border-slate-700 rounded-xl py-3 mr-2 active:opacity-90">
              <Text className="text-sm font-semibold text-white">{t('wallet.convert')}</Text>
            </Pressable>
            <Pressable className="flex-1 items-center bg-slate-800 border border-slate-700 rounded-xl py-3 active:opacity-90">
              <Text className="text-sm font-semibold text-action">{t('wallet.scanPay')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Tourist Physical Debit Card Teaser */}
      <View className="px-5 mb-6">
        <Text className="text-base font-bold text-ink mb-3">{t('wallet.myCards')}</Text>

        <Card variant="mint" className="p-5 border-teal-200">
          <View className="flex-row items-center justify-between mb-3">
            <Badge label={t('wallet.cardIssued')} variant="brand" size="sm" />
            <Text className="text-xs font-bold text-brand-dark">Shetab Network / شتاب</Text>
          </View>

          <Text className="text-lg font-mono font-bold text-ink tracking-wider mb-2">
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

      {/* Recent Transactions List — from walletStore (Money objects) */}
      <View className="px-5">
        <Text className="text-base font-bold text-ink mb-3">{t('wallet.transactions')}</Text>

        {transactions.map((tx) => {
          const isCredit = tx.amount.amount.isPositive();
          return (
            <Card
              key={tx.id}
              variant="flat"
              className="flex-row items-center justify-between mb-2.5 bg-surface border border-slate-100"
            >
              <View className="flex-row items-center">
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
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
        })}
      </View>
    </ScrollView>
  );
}
