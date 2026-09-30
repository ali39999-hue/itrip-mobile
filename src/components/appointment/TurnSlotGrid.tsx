import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Badge } from '@/components/ui/Badge';

export interface AppointmentSlotItem {
  id: string;
  startTime: string; // e.g. "09:30"
  endTime: string;   // e.g. "10:00"
  isFree: boolean;
  priceFormatted: string; // e.g. "$25" or "1,200,000 تومان"
}

export interface AppointmentDayItem {
  id: string; // e.g. "2026-11-15"
  dateLabel: string; // e.g. "15 آبان" or "Nov 15"
  dayOfWeek: string; // e.g. "دوشنبه" or "Mon"
  slots: AppointmentSlotItem[];
}

interface TurnSlotGridProps {
  days: AppointmentDayItem[];
  selectedDayId: string | null;
  selectedSlotId: string | null;
  onSelectDay: (dayId: string) => void;
  onSelectSlot: (slot: AppointmentSlotItem) => void;
}

export function TurnSlotGrid({
  days,
  selectedDayId,
  selectedSlotId,
  onSelectDay,
  onSelectSlot,
}: TurnSlotGridProps) {
  const activeDay = days.find((d) => d.id === selectedDayId) || days[0];
  const slots = activeDay?.slots ?? [];

  return (
    <View className="w-full">
      {/* 1. Horizontal Date Scrubber */}
      <Text className="text-xs font-bold text-sub mb-2">انتخاب تاریخ / Select Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2.5">
          {days.map((day) => {
            const isSelected = day.id === (selectedDayId || activeDay?.id);
            return (
              <Pressable
                key={day.id}
                onPress={() => onSelectDay(day.id)}
                className={`w-24 h-24 rounded-2xl items-center justify-between py-2.5 px-1 border ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-semibold ${isSelected ? 'text-emerald-700' : 'text-sub'}`}>
                  {day.dayOfWeek}
                </Text>
                <Text className={`text-lg font-bold ${isSelected ? 'text-emerald-800' : 'text-ink'}`}>
                  {day.dateLabel}
                </Text>
                <Text className="text-[10px] text-slate-400">
                  {day.slots.filter((s) => s.isFree).length} نوبت آزاد
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* 2. Morning / Afternoon / Evening Turns Matrix */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-bold text-sub">زمان‌های رزرو / Available Turns</Text>
        <Badge
          label={`${slots.filter((s) => s.isFree).length} Open`}
          variant="brand"
          size="sm"
        />
      </View>

      {slots.length === 0 ? (
        <View className="p-6 rounded-2xl bg-white border border-slate-200 items-center justify-center">
          <Text className="text-xs text-sub">هیچ نوبتی برای این روز تعریف نشده است.</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {slots.map((slot) => {
            const isSelected = slot.id === selectedSlotId;
            const isFree = slot.isFree;

            return (
              <Pressable
                key={slot.id}
                disabled={!isFree}
                onPress={() => onSelectSlot(slot)}
                className={`py-2.5 px-4 rounded-xl border flex-row items-center justify-between ${
                  !isFree
                    ? 'bg-slate-100 border-slate-200 opacity-40'
                    : isSelected
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'bg-white border-slate-200'
                }`}
                style={{ width: '48%' }}
              >
                <Text
                  className={`text-sm font-bold ${
                    isSelected ? 'text-white' : isFree ? 'text-ink' : 'text-slate-400'
                  }`}
                >
                  {slot.startTime}
                </Text>

                <Text
                  className={`text-[10px] font-semibold ${
                    isSelected ? 'text-emerald-100' : isFree ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {slot.priceFormatted}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
