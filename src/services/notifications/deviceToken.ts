import type { AxiosInstance } from 'axios';
import { registerForPushNotifications } from './index';

/**
 * Device token registration — keeps the server's push registry in sync.
 *
 * The token is registered after login and refreshed whenever FCM rotates it.
 * Failures are swallowed: a missing push token must never block the app.
 */

export function createDeviceTokenService(client: AxiosInstance) {
  return {
    async syncToken(): Promise<boolean> {
      const token = await registerForPushNotifications();
      if (!token) return false;
      try {
        await client.post('/devices/push-token', { token, platform: 'android' });
        return true;
      } catch {
        return false;
      }
    },

    async unregister(): Promise<void> {
      try {
        await client.delete('/devices/push-token');
      } catch {
        // Best-effort: local logout proceeds regardless.
      }
    },
  };
}

export type DeviceTokenService = ReturnType<typeof createDeviceTokenService>;
