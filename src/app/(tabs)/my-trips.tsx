import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/styles/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function MyTripsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showDriverCard, setShowDriverCard] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

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
        <Text className="text-2xl font-bold text-ink">{t('myTrips.title')}</Text>
        <Text className="text-xs text-sub mt-0.5">Offline-Ready Travel Companion & Vault</Text>
      </View>

      {/* Offline Guarantee Notice Banner */}
      <View className="px-5 mb-5">
        <View className="flex-row items-center rounded-2xl bg-emerald-50 border border-emerald-100 p-3.5">
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2}>
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </Svg>
          <Text className="flex-1 ml-2.5 text-xs text-emerald-800 font-medium">
            {t('myTrips.offlineNotice')}
          </Text>
        </View>
      </View>

      {/* Active Flight Ticket Card */}
      <View className="px-5 mb-5">
        <Text className="text-base font-bold text-ink mb-3">{t('myTrips.active')}</Text>

        <Card variant="elevated" className="border-t-4 border-t-brand p-5">
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View>
              <Text className="text-xs font-semibold text-sub">{t('myTrips.bookingRef')}: <Text className="text-ink font-bold">ITR-99824</Text></Text>
              <Text className="text-sm font-bold text-ink mt-0.5">Mahan Air · W5-104</Text>
            </View>
            <Badge label="CONFIRMED" variant="success" size="md" />
          </View>

          {/* Route Section */}
          <View className="flex-row items-center justify-between py-4">
            <View>
              <Text className="text-2xl font-bold text-ink">THR</Text>
              <Text className="text-xs text-sub">Tehran (IKA)</Text>
              <Text className="text-sm font-bold text-brand mt-1">08:30 AM</Text>
            </View>

            <View className="items-center px-4">
              <Text className="text-xs text-sub">Flight 1h 20m</Text>
              <Svg width={60} height={16} viewBox="0 0 60 16" fill="none">
                <Path d="M0 8h45m0 0l-4-4m4 4l-4 4" stroke={colors.brand} strokeWidth={2} />
              </Svg>
              <Badge label="Economy Y" variant="neutral" size="sm" />
            </View>

            <View className="items-end">
              <Text className="text-2xl font-bold text-ink">SYZ</Text>
              <Text className="text-xs text-sub">Shiraz (SYZ)</Text>
              <Text className="text-sm font-bold text-brand mt-1">09:50 AM</Text>
            </View>
          </View>

          {/* Details Row */}
          <View className="flex-row justify-between py-3 border-t border-slate-100 bg-soft/50 rounded-xl px-3 my-1">
            <View>
              <Text className="text-[11px] text-sub">{t('myTrips.seat')}</Text>
              <Text className="text-sm font-bold text-ink">14A</Text>
            </View>
            <View>
              <Text className="text-[11px] text-sub">{t('myTrips.terminal')}</Text>
              <Text className="text-sm font-bold text-ink">Terminal 4</Text>
            </View>
            <View>
              <Text className="text-[11px] text-sub">Date</Text>
              <Text className="text-sm font-bold text-ink">Oct 12, 2026</Text>
            </View>
          </View>

          {/* Action Button */}
          <View className="mt-3">
            <Button
              variant="action"
              size="md"
              title={t('myTrips.showQr')}
              onPress={() => setShowQrModal(true)}
            />
          </View>
        </Card>
      </View>

      {/* Hotel Reservation & Driver Card */}
      <View className="px-5 mb-5">
        <Card variant="elevated" className="border-t-4 border-t-action p-5">
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View>
              <Text className="text-xs font-semibold text-sub">Hotel Voucher</Text>
              <Text className="text-base font-bold text-ink mt-0.5">Shiraz Grand Hotel</Text>
            </View>
            <Badge label="5 STARS" variant="warning" size="sm" />
          </View>

          <View className="py-3">
            <Text className="text-xs text-sub">Check-in: <Text className="text-ink font-semibold">Oct 12, 2026 (14:00)</Text></Text>
            <Text className="text-xs text-sub mt-1">Stay: <Text className="text-ink font-semibold">3 Nights · Deluxe Suite</Text></Text>
          </View>

          <Button
            variant="outline"
            size="md"
            title={t('myTrips.driverCard')}
            onPress={() => setShowDriverCard(true)}
          />
        </Card>
      </View>

      {/* Taxi Driver Card Modal */}
      <Modal visible={showDriverCard} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-surface rounded-t-3xl p-6">
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />

            <Badge label="کارت مخصوص راننده تاکسی" variant="warning" size="md" className="mb-2" />
            <Text className="text-xl font-bold text-ink mb-1">
              لطفاً من را به این هتل برسانید:
            </Text>

            <View className="my-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
              <Text className="text-2xl font-bold text-ink text-center mb-2">
                هتل بزرگ شیراز
              </Text>
              <Text className="text-base text-ink text-center leading-6">
                شیراز، ورودی دروازه قرآن، بالاتر از میدان ابوالکلام، هتل بزرگ شیراز
              </Text>
              <Text className="text-sm font-semibold text-price text-center mt-3" dir="ltr">
                تلفن پذیرش: ۰۷۱-۳۲۲۷۴۸۲۰
              </Text>
            </View>

            <Text className="text-xs text-sub text-center mb-4">
              {t('myTrips.hotelAddress')} — بدون نیاز به اینترنت
            </Text>

            <Button
              variant="brand"
              size="md"
              title={t('common.close')}
              onPress={() => setShowDriverCard(false)}
            />
          </View>
        </View>
      </Modal>

      {/* QR Code Ticket Modal */}
      <Modal visible={showQrModal} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center p-6">
          <View className="bg-surface rounded-3xl p-6 w-full max-w-sm items-center">
            <Text className="text-lg font-bold text-ink mb-1">{t('myTrips.showQr')}</Text>
            <Text className="text-xs text-sub mb-5">ITR-99824 · W5-104 (Mahan Air)</Text>

            {/* QR Placeholder Graphic */}
            <View className="w-48 h-48 bg-slate-900 rounded-2xl items-center justify-center p-4 mb-4">
              <Svg width={140} height={140} viewBox="0 0 140 140">
                <Rect x="10" y="10" width="40" height="40" fill="#fff" />
                <Rect x="20" y="20" width="20" height="20" fill="#0F172A" />
                <Rect x="90" y="10" width="40" height="40" fill="#fff" />
                <Rect x="100" y="20" width="20" height="20" fill="#0F172A" />
                <Rect x="10" y="90" width="40" height="40" fill="#fff" />
                <Rect x="20" y="100" width="20" height="20" fill="#0F172A" />
                <Rect x="60" y="60" width="20" height="20" fill="#fff" />
                <Rect x="65" y="65" width="10" height="10" fill="#0F172A" />
              </Svg>
            </View>

            <Text className="text-xs text-sub text-center mb-5">
              High-Contrast Offline QR for Airport Scanner
            </Text>

            <Button
              variant="outline"
              size="md"
              title={t('common.close')}
              className="w-full"
              onPress={() => setShowQrModal(false)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
