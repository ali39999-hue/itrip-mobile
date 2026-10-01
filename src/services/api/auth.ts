import type { AxiosInstance } from 'axios';
import { z } from 'zod';
import { saveTokens, clearTokens, type StoredTokens } from '@/services/secure/tokens';
import type { AuthStatus } from './authTypes';

/** Auth API — OTP-based login with PKCE-ready token exchange. */

const SendOtpResponse = z.object({ ok: z.boolean() });
const VerifyOtpResponse = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  userId: z.string().min(1),
});

export function createAuthService(client: AxiosInstance) {
  return {
    async sendOtp(phone: string): Promise<void> {
      const res = await client.post('/auth/otp/send', { phone });
      SendOtpResponse.parse(res.data);
    },

    async verifyOtp(phone: string, code: string): Promise<AuthStatus> {
      const res = await client.post('/auth/otp/verify', { phone, code });
      const data = VerifyOtpResponse.parse(res.data);
      const tokens: StoredTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      await saveTokens(tokens);
      return { state: 'authenticated', userId: data.userId, displayLanguage: 'fa' };
    },

    async logout(): Promise<void> {
      try {
        await client.post('/auth/logout');
      } catch {
        // server may be unreachable; local session must still be cleared
      }
      await clearTokens();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
