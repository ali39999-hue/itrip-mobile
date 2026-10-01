import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Decimal from 'decimal.js';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useWalletStore } from '@/stores/walletStore';

/**
 * SOS Hub — offline emergency utilities for travelers in Iran.
 *
 * - Currency converter: uses the last cached USD/IRR rate from the wallet
 *   store (works fully offline once rates have synced once).
 * - Phrasebook: essential Persian phrases with phonetics, playable by tapping.
 * - Emergency dialer: direct tel: links to Tourist Police (110) & EMS (115).
 */

const PHRASES: Array<{ fa: string; en: string; translit: string }> = [
  { fa: 'سلام، کمک کنید!', en: 'Hello, please help!', translit: 'Salam, komak konid!' },
  { fa: 'مطبخ / دکتر کجاست؟', en: 'Where is a clinic / doctor?', translit: 'Motakhass / doctor kojast?' },
  { fa: 'لطفاً من را به این آدرس ببرید', en: 'Please take me to this address', translit: 'Lotfan man ra be in address bebarrant' },
  { fa: 'چقدر است؟', en: 'How much is it?', translit: 'Cheghadr ast?' },
  { fa: 'پلیس', en: 'Police', translit: 'Police' },
  { fa: 'داروخانه', en: 'Pharmacy', translit: 'Daroukhaneh' },
  { fa: 'من مفقود شدم', en: 'I am lost', translit: 'Man mafghoud shodam' },
  { fa: 'دچار تصادف شده‌ایم', en: 'We had an accident', translit: 'Dechar tasadof shodeim' },
];

const EMERGENCY_NUMBERS = [
  { labelKey: 'sos.touristPolice', tel: '110' },
  { labelKey: 'sos.medical', tel: '115' },
  { labelKey: 'sos.fireRescue', tel: '125' },
] as const;

export default function SosScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rate = useWalletStore((s) => s.usdIrrRate);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'usd2irr' | 'irr2usd'>('usd2irr');

  const converted = useMemo(() => {
    const n = amount.replace(/[^\d.]/g, '');
    if (!n || isNaN(Number(n))) return null;
    const d = new Decimal(n);
    if (direction === 'usd2irr') {
      return `${d.times(rate).toFixed(0)} IRR`;
    }
    return `$ ${d.dividedBy(rate).toFixed(2)} USD`;
  }, [amount, direction, rate]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      className="flex-1 bg-soft"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-rose">SOS</Text>
            <Text className="text-xs text-sub mt-0.5">{t('sos.subtitle')}</Text>
          </View>
          <Pressable onPress={() => router.back()} className="rounded-xl bg-white border border-slate-200 px-3 py-2">
            <Text className="text-xs font-semibold text-ink">{t('common.back')}</Text>
          </Pressable>
        </View>

        {/* Emergency Dialer */}
        <View className="px-5 mb-6">
          <Text className="text-sm font-bold text-ink mb-2.5">{t('sos.emergency')}</Text>
          <View className="gap-2.5">
            {EMERGENCY_NUMBERS.map((e) => (
              <Pressable
                key={e.tel}
                onPress={() => void Linking.openURL(`tel:${e.tel}`)}
                className="rounded-2xl bg-white border border-rose-100 p-4 flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-sm font-bold text-ink">{t(e.labelKey)}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-rose" style={{ writingDirection: 'ltr' }}>
                    {e.tel}
                  </Text>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill={colors.rose}>
                    <Path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" />
                  </Svg>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Offline Currency Converter */}
        <View className="px-5 mb-6">
          <Text className="text-sm font-bold text-ink mb-2.5">{t('sos.currencyConverter')}</Text>
          <Card variant="elevated" className="p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Badge label={t('sos.offlineBadge')} variant="success" size="sm" />
              <Text className="text-[11px] text-sub" style={{ writingDirection: 'ltr' }}>
                1 USD ≈ {rate.toFixed(0)} IRR
              </Text>
            </View>

            <View className="flex-row gap-2 mb-3">
              <Pressable
                onPress={() => setDirection('usd2irr')}
                className={`flex-1 rounded-xl border px-3 py-2 items-center ${direction === 'usd2irr' ? 'bg-brand border-brand' : 'bg-soft border-slate-200'}`}
              >
                <Text className={`text-xs font-semibold ${direction === 'usd2irr' ? 'text-white' : 'text-ink'}`}>
                  {t('sos.pairUsdIrr')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDirection('irr2usd')}
                className={`flex-1 rounded-xl border px-3 py-2 items-center ${direction === 'irr2usd' ? 'bg-brand border-brand' : 'bg-soft border-slate-200'}`}
              >
                <Text className={`text-xs font-semibold ${direction === 'irr2usd' ? 'text-white' : 'text-ink'}`}>
                  {t('sos.pairIrrUsd')}
                </Text>
              </Pressable>
            </View>

            <TextInput
              className="rounded-xl border border-slate-200 bg-soft px-4 py-3 text-base text-ink"
              keyboardType="decimal-pad"
              placeholder={direction === 'usd2irr' ? '0.00 USD' : '0 IRR'}
              placeholderTextColor={colors.sub}
              value={amount}
              onChangeText={setAmount}
            />
            {converted ? (
              <Text className="mt-3 text-xl font-bold text-price text-center" style={{ writingDirection: 'ltr' }}>
                = {converted}
              </Text>
            ) : null}
          </Card>
        </View>

        {/* Phrasebook */}
        <View className="px-5">
          <Text className="text-sm font-bold text-ink mb-2.5">{t('sos.phrasebook')}</Text>
          <View className="gap-2.5">
            {PHRASES.map((p) => (
              <Card key={p.en} variant="flat" className="p-4 bg-white border border-slate-200">
                <Text className="text-base font-bold text-ink text-center leading-6">{p.fa}</Text>
                <Text className="text-xs text-sub text-center mt-1.5">{p.translit}</Text>
                <Text className="text-[11px] text-sub text-center mt-0.5">{p.en}</Text>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
