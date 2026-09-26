import React, { useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/api';
import { colors } from '@/styles/colors';

const PHONE_RE = /^\+?[0-9]{10,15}$/;

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendOtp = async () => {
    setError(null);
    const normalized = phone.trim();
    if (!PHONE_RE.test(normalized)) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setSending(true);
    try {
      await authService.sendOtp(normalized);
      router.push({ pathname: '/(auth)/otp', params: { phone: normalized } });
    } catch {
      setError(t('auth.otpSendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      className="flex-1 bg-surface"
      style={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
    >
      <Text className="text-3xl font-bold text-ink">iTrip</Text>
      <Text className="mt-2 text-base text-sub">{t('auth.loginTitle')}</Text>

      <TextInput
        className="mt-8 rounded-xl border border-slate-200 bg-soft px-4 py-3.5 text-base text-ink"
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder={t('auth.phonePlaceholder')}
        placeholderTextColor={colors.sub}
        value={phone}
        onChangeText={setPhone}
        maxLength={16}
      />
      {error ? <Text className="mt-2 text-sm text-rose">{error}</Text> : null}

      <Pressable
        onPress={sendOtp}
        disabled={sending}
        className="mt-6 items-center rounded-xl bg-brand py-4 active:bg-brand-dark"
        accessibilityRole="button"
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">{t('auth.sendCode')}</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}
