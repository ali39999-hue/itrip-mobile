import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { parseNotificationPayload, type NotificationPayload } from './payload';

/**
 * Push notifications — FCM transport for flight/gate alerts.
 *
 * Responsibilities:
 * - Register the device and return the FCM token for the server.
 * - Route incoming payloads to typed handlers (flight delay, gate change,
 *   hotel check-in reminder).
 * - Deep-link payloads into the vault (works offline once cached).
 *
 * The payload contract lives in ./payload (pure Zod, unit-tested).
 */

export { NotificationPayloadSchema, parseNotificationPayload } from './payload';
export type { NotificationPayload } from './payload';

/** Foreground presentation: always show the alert (travel-critical). */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** Android channel with high importance so gate changes break through. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('travel-alerts', {
    name: 'Travel Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00A9A5',
    sound: 'default',
  });
}

/**
 * Registers for push and returns the FCM device token.
 * Returns null on simulators/emulators or when permission is denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  await ensureAndroidChannel();

  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' ? token.data : null;
  } catch {
    // Expo Go / missing FCM config — non-fatal, server simply has no token.
    return null;
  }
}

/** Re-exported for callers that only need routing helpers. */
export function routePayload(
  data: unknown,
  handler: (payload: NotificationPayload) => void,
): void {
  const payload = parseNotificationPayload(data);
  if (payload) handler(payload);
}
