import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useBiometrics } from '@/hooks/useBiometrics';
import * as SecureStore from 'expo-secure-store';
import i18n, {
  applyLanguageDirection,
  isRTL,
  LANGUAGE_NAMES,
  LANGUAGE_STORAGE_KEY,
  type AppLanguage,
  SUPPORTED_LANGUAGES,
} from '@/i18n';

const CURRENCIES = ['USD', 'IRR', 'EUR', 'AED', 'CNY', 'RUB'] as const;

export default function AccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { auth, biometricsEnabled, setBiometrics, logout, currency, setCurrency } = useAuthStore();
  const { hasHardware, isEnrolled, authenticate } = useBiometrics();
  const [offlineSync, setOfflineSync] = useState(true);

  const handleLanguageChange = (lng: AppLanguage) => {
    // Direction must be compared BEFORE switching so we know whether the
    // layout flip (fa/ar <-> en/zh/ru) needs a restart prompt.
    const directionChanged = isRTL(lng) !== isRTL(i18n.language);
    applyLanguageDirection(lng);
    // Persist the choice; SecureStore-backed so it survives restarts and logout.
    SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, lng).catch(() => undefined);
    // Wait for changeLanguage to settle so the prompt below is rendered with
    // the NEW language's strings (bundled resources, but the switch is async).
    void i18n.changeLanguage(lng).then(() => {
      if (directionChanged) {
        // RN only re-evaluates the RTL/LTR layout on the next process start.
        // expo-updates is not installed, so guide a manual restart.
        Alert.alert(t('account.languageRestartTitle'), t('account.languageRestartBody'), [
          { text: t('common.confirm') },
        ]);
      }
    });
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  const profile = auth.state === 'authenticated' ? auth.profile : undefined;
  const isKycApproved = profile?.kycApproved ?? false;

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
        <Text className="text-2xl font-bold text-ink">{t('account.title')}</Text>
      </View>

      {/* User Profile Card */}
      <View className="px-5 mb-5">
        <Card variant="elevated" className="p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 me-2">
              <View className="w-14 h-14 rounded-2xl bg-mint items-center justify-center me-3.5">
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.brand} strokeWidth={2}>
                  <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <Circle cx={12} cy={7} r={4} />
                </Svg>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-ink" numberOfLines={1}>
                  {auth.state === 'authenticated'
                    ? (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : t('account.verifiedTraveler'))
                    : t('auth.guestGreeting')}
                </Text>
                <Text className="text-xs text-sub mt-0.5" numberOfLines={1}>
                  {auth.state === 'authenticated'
                    ? t('account.profileIdLine', { id: auth.userId, phone: auth.phone || '' })
                    : t('account.loginToSave')}
                </Text>
              </View>
            </View>

            {auth.state === 'authenticated' ? (
              <Badge
                label={isKycApproved ? t('account.kycVerified') : t('account.kycPending')}
                variant={isKycApproved ? 'success' : 'warning'}
                size="sm"
              />
            ) : null}
          </View>

          {auth.state !== 'authenticated' ? (
            <View className="mt-4 pt-3 border-t border-slate-100">
              <Button
                variant="brand"
                size="md"
                title={t('auth.loginAction')}
                onPress={() => router.push('/(auth)/login')}
              />
            </View>
          ) : (
            <View className="mt-4 pt-3 border-t border-slate-100 flex-row justify-between items-center">
              <Text className="text-xs text-sub">{t('account.loyaltyTier')}</Text>
              <Badge
                label={`${profile?.loyaltyTier || 'BRONZE'} · ${t('account.loyaltyPoints', { points: profile?.loyaltyPoints || 120 })}`}
                variant="brand"
                size="sm"
              />
            </View>
          )}
        </Card>
      </View>

      {/* Language Switcher (5 Languages) */}
      <View className="px-5 mb-5">
        <Text className="text-sm font-bold text-ink mb-2.5">{t('account.language')}</Text>
        <Card variant="flat" className="p-3 bg-surface border border-slate-200">
          <View className="flex-row flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = i18n.language === lang;
              return (
                <Pressable
                  key={lang}
                  onPress={() => handleLanguageChange(lang)}
                  className={`px-3 py-2 rounded-xl border ${
                    active
                      ? 'bg-brand border-brand'
                      : 'bg-soft border-slate-200'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                    {LANGUAGE_NAMES[lang]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>

      {/* Currency Switcher */}
      <View className="px-5 mb-5">
        <Text className="text-sm font-bold text-ink mb-2.5">{t('account.currency')}</Text>
        <Card variant="flat" className="p-3 bg-surface border border-slate-200">
          <View className="flex-row flex-wrap gap-2">
            {CURRENCIES.map((curr) => {
              const active = currency === curr;
              return (
                <Pressable
                  key={curr}
                  onPress={() => setCurrency(curr)}
                  className={`px-3 py-2 rounded-xl border ${
                    active
                      ? 'bg-brand border-brand'
                      : 'bg-soft border-slate-200'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                    {curr}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>

      {/* Security & Settings */}
      <View className="px-5 mb-5">
        <Text className="text-sm font-bold text-ink mb-2.5">{t('account.securitySettings')}</Text>
        <Card variant="elevated" className="p-0 overflow-hidden divide-y divide-slate-100">
          {/* Biometrics */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1 pe-3">
              <Text className="text-sm font-semibold text-ink">{t('account.biometrics')}</Text>
              <Text className="text-xs text-sub mt-0.5">
                {hasHardware && isEnrolled
                  ? t('account.biometricsHint')
                  : t('account.biometricsUnavailable')}
              </Text>
            </View>
            <Switch
              value={biometricsEnabled && hasHardware && isEnrolled}
              onValueChange={(v) => {
                if (!hasHardware || !isEnrolled) return;
                if (v) {
                  void authenticate(t('account.biometrics')).then((ok) => setBiometrics(ok));
                } else {
                  setBiometrics(false);
                }
              }}
              disabled={!hasHardware || !isEnrolled}
              trackColor={{ false: '#E2E8F0', true: colors.brand }}
            />
          </View>

          {/* Offline Sync */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1 pe-3">
              <Text className="text-sm font-semibold text-ink">{t('account.offlineMode')}</Text>
              <Text className="text-xs text-sub mt-0.5">{t('account.offlineSyncHint')}</Text>
            </View>
            <Switch
              value={offlineSync}
              onValueChange={setOfflineSync}
              trackColor={{ false: '#E2E8F0', true: colors.brand }}
            />
          </View>
        </Card>
      </View>

      {/* Emergency & Support */}
      <View className="px-5 mb-6">
        <Text className="text-sm font-bold text-ink mb-2.5">{t('account.sos')}</Text>
        <Pressable onPress={() => router.push('/sos')}>
          <Card variant="flat" className="p-4 bg-rose-50/60 border border-rose-100">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-bold text-rose">{t('account.emergencyAssistance')}</Text>
                <Text className="text-xs text-rose-700/80 mt-0.5">{t('account.emergencyNumbers')}</Text>
              </View>
              <Badge label={t('account.concierge247')} variant="danger" size="sm" />
            </View>
          </Card>
        </Pressable>
      </View>

      {/* Logout button */}
      {auth.state === 'authenticated' ? (
        <View className="px-5 mb-8">
          <Button
            variant="outline"
            size="md"
            title={t('auth.logout')}
            className="border-rose/30"
            onPress={handleLogout}
          />
        </View>
      ) : null}

      <Text className="text-center text-xs text-sub pb-4">
        {t('account.version')} 0.2.0 · iTRIP Production v3.0
      </Text>
    </ScrollView>
  );
}
