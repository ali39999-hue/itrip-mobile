import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, Alert, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ActivityIndicator, View } from 'react-native';
import '../styles/global.css';
import '../i18n';
import { colors } from '@/styles/colors';
import { useAuthStore } from '@/stores/authStore';
import { useVaultStore } from '@/stores/vaultStore';
import { useAppFonts } from '@/hooks/useAppFonts';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { registerBackgroundSync, syncAll } from '@/services/sync/backgroundSync';
import type { NotificationPayload } from '@/services/notifications';
import i18n from '@/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);
  const loadVault = useVaultStore((s) => s.load);
  const { loaded: fontsLoaded } = useAppFonts();

  useEffect(() => {
    void bootstrapAuth();
    // Warm up the offline vault so vouchers render instantly offline.
    void loadVault().catch(() => {
      // Vault DB can fail on first launch (no permissions yet) — non-fatal.
    });
    // Initial sync with backend
    void syncAll();
    // Schedule periodic vault refresh via WorkManager (best-effort).
    void registerBackgroundSync();

    // Trigger sync whenever the app resumes to the foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncAll();
      }
    });

    return () => appStateSub.remove();
  }, [bootstrapAuth, loadVault]);

  // Travel alerts deep-link straight into the vault entry they concern.
  const onNotification = useCallback((payload: NotificationPayload) => {
    if (payload.type === 'FLIGHT_DELAY') {
      Alert.alert(
        i18n.t('notifications.flightDelayTitle'),
        i18n.t('notifications.flightDelayBody', {
          flight: payload.flightNumber,
          minutes: payload.delayMinutes,
        }),
      );
    } else if (payload.type === 'GATE_CHANGE') {
      Alert.alert(
        i18n.t('notifications.gateChangeTitle'),
        i18n.t('notifications.gateChangeBody', {
          flight: payload.flightNumber,
          gate: payload.newGate,
        }),
      );
    }
    router.push('/(tabs)/my-trips');
  }, []);

  usePushNotifications(onNotification);

  // Splash gate: wait for fonts before revealing the UI (never blocks > splash).
  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar
            style={isDark ? 'light' : 'dark'}
            backgroundColor={colors.surface}
          />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
