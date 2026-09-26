import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { PassengerSchema } from '@/domains/identity/passenger';
import { useBookingStore } from '@/stores/bookingStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/styles/colors';

type FormState = {
  firstNameLatin: string;
  lastNameLatin: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  passportExpiry: string;
};

const emptyForm: FormState = {
  firstNameLatin: '',
  lastNameLatin: '',
  dateOfBirth: '',
  passportNumber: '',
  nationality: '',
  passportExpiry: '',
};

/** Same shape as PassengerSchema but without generated/optional fields. */
const FormSchema = PassengerSchema;

/**
 * Passengers step — collects each traveler's data, validated by the same
 * PassengerSchema the web platform uses (shared domain contract).
 * Passport validity is checked against the travel date before proceeding.
 */
export default function PassengersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const draft = useBookingStore((s) => s.draft);
  const addPassenger = useBookingStore((s) => s.addPassenger);
  const removePassenger = useBookingStore((s) => s.removePassenger);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const requiredPax = draft.search?.adults ?? 1;
  const currentCount = draft.passengers.length;
  const canProceed = currentCount > 0;
  const needsMorePax = currentCount < requiredPax;

  const onAddPassenger = () => {
    setError(null);
    const result = FormSchema.safeParse({
      ...form,
      gender,
      type: 'ADULT',
      passport: {
        number: form.passportNumber.toUpperCase().trim(),
        nationality: form.nationality.toUpperCase().trim(),
        expiryDate: form.passportExpiry.trim(),
      },
    });

    if (!result.success) {
      setError(t('booking.formInvalid'));
      return;
    }

    addPassenger({ ...result.data, id: `pax-${Date.now()}` });
    setForm(emptyForm);

    // If all required passengers have been added, navigate smoothly to review
    if (currentCount + 1 >= requiredPax) {
      router.push('/booking/review');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      className="flex-1 bg-soft"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        <Text className="text-2xl font-bold text-ink">{t('booking.passengersTitle')}</Text>
        <Text className="mt-1 text-sm text-sub">
          {t('booking.passengersProgress', { done: currentCount, total: requiredPax })}
        </Text>

        {/* Added passengers list */}
        {draft.passengers.map((p, idx) => (
          <Card key={p.id} variant="mint" className="mt-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-7 h-7 rounded-full bg-brand/20 items-center justify-center mr-2.5">
                  <Text className="text-xs font-bold text-brand">{idx + 1}</Text>
                </View>
                <View>
                  <Text
                    className="text-sm font-semibold text-ink"
                    style={{ writingDirection: 'ltr' }}
                  >
                    {p.firstNameLatin} {p.lastNameLatin}
                  </Text>
                  <Text className="text-[10px] text-sub font-mono" style={{ writingDirection: 'ltr' }}>
                    {p.passport.nationality} · {p.passport.number}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  if (p.id) removePassenger(p.id);
                }}
                className="p-1.5 rounded-lg bg-rose-50"
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.rose} strokeWidth={2}>
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </Pressable>
            </View>
          </Card>
        ))}

        {/* Passenger input form (if more pax required or user wants to add) */}
        {needsMorePax || currentCount === 0 ? (
          <Card variant="elevated" className="mt-4">
            <Text className="text-sm font-bold text-ink mb-3">
              {t('booking.passengersProgress', { done: currentCount + 1, total: requiredPax })}
            </Text>

            <Input label={t('booking.firstNameLatin')} value={form.firstNameLatin} onChangeText={set('firstNameLatin')} autoCapitalize="words" placeholder="e.g. Sarah" />
            <Input label={t('booking.lastNameLatin')} value={form.lastNameLatin} onChangeText={set('lastNameLatin')} autoCapitalize="words" placeholder="e.g. Jenkins" />

            {/* Gender Toggle */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-sub mb-1">Gender</Text>
              <View className="flex-row gap-2">
                {(['MALE', 'FEMALE'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    className={`flex-1 py-2 rounded-xl border items-center ${
                      gender === g ? 'border-brand bg-brand/10' : 'border-slate-200 bg-surface'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${gender === g ? 'text-brand' : 'text-sub'}`}>
                      {g === 'MALE' ? 'Male / آقا' : 'Female / خانم'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Input label={t('booking.dateOfBirth')} value={form.dateOfBirth} onChangeText={set('dateOfBirth')} placeholder="1990-05-15" />
            <Input label={t('booking.passportNumber')} value={form.passportNumber} onChangeText={set('passportNumber')} autoCapitalize="characters" placeholder="N8829103" />
            <Input label={t('booking.nationality')} value={form.nationality} onChangeText={set('nationality')} maxLength={2} autoCapitalize="characters" placeholder="FR" />
            <Input label={t('booking.passportExpiry')} value={form.passportExpiry} onChangeText={set('passportExpiry')} placeholder="2028-10-20" helperText={t('booking.passportValidityHint')} />

            {error ? <Text className="mt-2 text-sm text-rose">{error}</Text> : null}

            <View className="mt-4">
              <Button title={t('booking.addPassenger')} onPress={onAddPassenger} />
            </View>
          </Card>
        ) : null}

        {/* Action Button */}
        {canProceed ? (
          <View className="mt-4">
            <Button
              variant="action"
              size="lg"
              title={t('common.confirm')}
              onPress={() => router.push('/booking/review')}
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
