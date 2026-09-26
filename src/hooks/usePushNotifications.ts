import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/authStore';
import { deviceTokenService } from '@/services/notifications/deviceToken';
import {
  configureNotificationHandler,
  parseNotificationPayload,
  type NotificationPayload,
} from '@/services/notifications';

/**
 * Push notification lifecycle.
 *
 * - Configures the foreground handler + Android channel once.
 * - Registers the FCM token with the server after authentication.
 * - Routes typed payloads to `onPayload` (flight delay, gate change, ...).
 */
export function usePushNotifications(onPayload?: (payload: NotificationPayload) => void) {
  const auth = useAuthStore((s) => s.auth);
  const handlerRef = useRef(onPayload);
  handlerRef.current = onPayload;

  // Configure handler + channel exactly once per app launch.
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Register the device token whenever we become authenticated.
  useEffect(() => {
    if (auth.state !== 'authenticated') return;
    void deviceTokenService.syncToken();
  }, [auth.state]);

  // Route tapped/foreground notifications.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = parseNotificationPayload(response.notification.request.content.data);
      if (payload) handlerRef.current?.(payload);
    });
    return () => sub.remove();
  }, []);
}
