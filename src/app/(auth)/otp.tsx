import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  type TextInput as RNTextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/styles/colors';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone: string }>();
  const phone = params.phone ?? '';

  const [digits, setDigits] = useState<string[]>(Array<string>(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const inputs = useRef<Array<RNTextInput | null>>([]);

  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const submit = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH) return;
      setVerifying(true);
      setError(null);
      try {
        const status = await authService.verifyOtp(phone, code);
        if (status.state === 'authenticated') {
          setAuthenticated(status.userId, status.displayLanguage, phone);
          router.replace('/(tabs)');
        } else {
          setError(t('auth.invalidCode'));
          setDigits(Array<string>(OTP_LENGTH).fill(''));
        }
      } catch {
        setError(t('auth.invalidCode'));
        setDigits(Array<string>(OTP_LENGTH).fill(''));
      } finally {
        setVerifying(false);
      }
    },
    [phone, setAuthenticated, t],
  );

  const onChangeDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === index ? '' : d)));
      return;
    }
    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < OTP_LENGTH; i++) {
      next[index + i] = clean[i]!;
    }
    setDigits(next);
    const focusIndex = Math.min(index + clean.length, OTP_LENGTH - 1);
    inputs.current[focusIndex]?.focus();
    const joined = next.join('');
    if (joined.length === OTP_LENGTH && !joined.includes('')) {
      void submit(joined);
    }
  };

  const resend = async () => {
    try {
      await authService.sendOtp(phone);
      setResendIn(RESEND_SECONDS);
    } catch {
      setError(t('auth.otpSendFailed'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      className="flex-1 bg-surface"
      style={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
    >
      <Text className="text-2xl font-bold text-ink">{t('auth.otpTitle')}</Text>
      <Text className="mt-2 text-base text-sub" style={{ textAlign: 'left' }}>
        {phone}
      </Text>

      <View className="mt-8 flex-row justify-between" style={{ flexDirection: 'row' }}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              inputs.current[i] = r;
            }}
            className="h-14 w-12 rounded-xl border border-slate-200 bg-soft text-center text-xl font-bold text-ink"
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            value={d}
            onChangeText={(v) => onChangeDigit(i, v)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
                inputs.current[i - 1]?.focus();
              }
            }}
          />
        ))}
      </View>
      {error ? <Text className="mt-3 text-sm text-rose">{error}</Text> : null}

      {verifying ? (
        <ActivityIndicator className="mt-6" color={colors.brand} />
      ) : (
        <Pressable
          onPress={() => void resend()}
          disabled={resendIn > 0}
          className="mt-6 self-start"
        >
          <Text className={`text-sm ${resendIn > 0 ? 'text-sub' : 'text-brand font-semibold'}`}>
            {resendIn > 0 ? t('auth.resendIn', { seconds: resendIn }) : t('auth.resend')}
          </Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}
