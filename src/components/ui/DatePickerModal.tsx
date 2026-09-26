import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { formatIsoToJalali } from '@/domains/calendar/jalali';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
  title?: string;
  minDate?: string;
}

/**
 * Dual Jalali / Gregorian Date Picker Modal (Phase 14 & 15).
 */
export function DatePickerModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
  title,
}: DatePickerModalProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isPersian = i18n.language === 'fa';

  // Helper to get formatted ISO date string for offset days
  const getDateOffset = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const presets = [
    { label: t('date.today') || 'Today', date: getDateOffset(0) },
    { label: t('date.tomorrow') || 'Tomorrow', date: getDateOffset(1) },
    { label: t('date.in3Days') || '+3 Days', date: getDateOffset(3) },
    { label: t('date.nextWeek') || 'Next Week', date: getDateOffset(7) },
    { label: t('date.in2Weeks') || '+2 Weeks', date: getDateOffset(14) },
    { label: t('date.in1Month') || '+1 Month', date: getDateOffset(30) },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-surface rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 20 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-ink">{title || t('search.departureDate')}</Text>
            <Pressable onPress={onClose}>
              <Text className="text-sm font-semibold text-sub">{t('common.cancel')}</Text>
            </Pressable>
          </View>

          {/* Current Selection Preview */}
          <View className="p-4 rounded-2xl bg-mint/20 border border-teal-200/50 mb-4">
            <Text className="text-xs text-brand-dark font-medium mb-1">
              {t('date.selectedDate') || 'Selected Date'}
            </Text>
            <Text className="text-xl font-bold text-ink" style={{ writingDirection: 'ltr' }}>
              {selectedDate}
            </Text>
            <Text className="text-sm font-semibold text-brand mt-0.5">
              {formatIsoToJalali(selectedDate, isPersian ? 'fa' : 'en')}
            </Text>
          </View>

          {/* Date Presets Grid */}
          <Text className="text-xs text-sub mb-2">{t('date.quickSelect') || 'Quick Select'}</Text>
          <View className="gap-2 mb-6">
            {presets.map((p) => {
              const isSelected = selectedDate === p.date;
              return (
                <Pressable
                  key={p.date}
                  onPress={() => onSelect(p.date)}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    isSelected ? 'border-brand bg-brand/10' : 'border-slate-200 bg-surface'
                  }`}
                >
                  <View>
                    <Text className="text-sm font-bold text-ink">{p.label}</Text>
                    <Text className="text-[11px] text-sub">{p.date}</Text>
                  </View>
                  <Text className="text-xs font-semibold text-brand">
                    {formatIsoToJalali(p.date, isPersian ? 'fa' : 'en')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button variant="action" size="lg" title={t('common.confirm') || 'Confirm'} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
