import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PassengerSchema } from '@/domains/identity/passenger';
import { useBookingStore } from '@/stores/bookingStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

  const [form, setForm] = useState<FormState>(emptyForm);
  const [gender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const onSubmit = () => {
    setError(null);
    const result = FormSchema.safeParse({
      ...form,
      gender,
      type: 'ADULT',
      passport: {
        number: form.passportNumber.toUpperCase(),
        nationality: form.nationality.toUpperCase(),
        expiryDate: form.passportExpiry,
      },
    });    if (!result.success) {
      setError(t('booking.formInvalid'));
      return;
    }
    addPassenger({ ...result.data, id: `pax-${Date.now()}` });
    setForm(emptyForm);
    router.push('/booking/review');
  };

  const requiredPax = draft.search?.adults ?? 1;
  const canProceed = draft.passengers.length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      className="flex-1 bg-soft"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        <Text className="text-2xl font-bold text-ink">{t('booking.passengersTitle')}</Text>
        <Text className="mt-1 text-sm text-sub">
          {t('booking.passengersProgress', { done: draft.passengers.length, total: requiredPax })}
        </Text>

        {/* Added passengers */}
        {draft.passengers.map((p) => (
          <Card key={p.id} variant="mint" className="mt-3">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-sm font-semibold text-ink"
                style={{ writingDirection: 'ltr' }}
              >
                {p.firstNameLatin} {p.lastNameLatin}
              </Text>
              <Badge label={p.passport.number} variant="brand" size="sm" />
            </View>
          </Card>
        ))}

        {/* Passenger form */}
        <Card variant="elevated" className="mt-4">
          <Input label={t('booking.firstNameLatin')} value={form.firstNameLatin} onChangeText={set('firstNameLatin')} autoCapitalize="words" />
          <Input label={t('booking.lastNameLatin')} value={form.lastNameLatin} onChangeText={set('lastNameLatin')} autoCapitalize="words" />
          <Input label={t('booking.dateOfBirth')} value={form.dateOfBirth} onChangeText={set('dateOfBirth')} placeholder="1990-05-15" />
          <Input label={t('booking.passportNumber')} value={form.passportNumber} onChangeText={set('passportNumber')} autoCapitalize="characters" placeholder="N8829103" />
          <Input label={t('booking.nationality')} value={form.nationality} onChangeText={set('nationality')} maxLength={2} autoCapitalize="characters" placeholder="FR" />
          <Input label={t('booking.passportExpiry')} value={form.passportExpiry} onChangeText={set('passportExpiry')} placeholder="2028-10-20" helperText={t('booking.passportValidityHint')} />

          {error ? <Text className="mt-2 text-sm text-rose">{error}</Text> : null}

          <View className="mt-4">
            <Button title={t('booking.addPassenger')} onPress={onSubmit} />
          </View>
        </Card>

        <View className="mt-4">
          <Button
            variant="action"
            title={t('common.confirm')}
            onPress={() => router.push('/booking/review')}
            disabled={!canProceed}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
