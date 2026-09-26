import { z } from 'zod';
import type { AxiosInstance } from 'axios';

/**
 * Server-authoritative Wallet API Service.
 *
 * Financial Invariants (Phase 2 — P0 Wallet & Ledger Integrity):
 * - Balances are maintained strictly on the backend double-entry financial ledger (ACCOUNTING_MODEL.md).
 * - Mobile NEVER fabricates synthetic balances or fake seed transactions.
 * - Local wallet state serves as an encrypted, reactive offline cache of the authoritative server state.
 */

export const WalletBalancesSchema = z.object({
  USD: z.string().default('0.00'),
  IRR: z.string().default('0'),
  EUR: z.string().default('0.00'),
  AED: z.string().default('0.00'),
  CNY: z.string().default('0.00'),
  RUB: z.string().default('0.00'),
  usdIrrRate: z.string().default('600000'),
  loyaltyPoints: z.number().int().default(0),
  loyaltyTier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).default('BRONZE'),
  lastSyncedAt: z.string(),
});
export type WalletBalances = z.infer<typeof WalletBalancesSchema>;

export const ServerTransactionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  date: z.string(),
  amount: z.string(),
  currency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  category: z.enum(['flight', 'hotel', 'topup', 'atm', 'pos', 'transfer']),
  status: z.enum(['PENDING', 'SETTLED', 'FAILED', 'REFUNDED']).default('SETTLED'),
  reference: z.string().optional(),
});
export type ServerTransaction = z.infer<typeof ServerTransactionSchema>;

export const TopUpIntentParamsSchema = z.object({
  amount: z.string().min(1),
  currency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  method: z.enum(['shetab', 'ecardo_crypto', 'ecardo_card', 'wechat_alipay']),
  idempotencyKey: z.string().min(1),
});
export type TopUpIntentParams = z.infer<typeof TopUpIntentParamsSchema>;

export const TopUpIntentResponseSchema = z.object({
  success: z.boolean(),
  intentId: z.string().min(1),
  redirectUrl: z.string().optional(),
  gatewayReference: z.string().optional(),
  error: z.string().optional(),
});
export type TopUpIntentResponse = z.infer<typeof TopUpIntentResponseSchema>;

export function createWalletService(client: AxiosInstance) {
  return {
    /**
     * Fetches authoritative wallet balances and FX rates from the server ledger.
     * Strictly throws on network failure — never returns a synthetic $1450 balance.
     */
    async getBalances(): Promise<WalletBalances> {
      const res = await client.get('/wallet/balances');
      return WalletBalancesSchema.parse(res.data);
    },

    /**
     * Fetches transaction history from the server-side double-entry ledger.
     */
    async getTransactions(): Promise<ServerTransaction[]> {
      const res = await client.get('/wallet/transactions');
      const data = res.data;
      if (Array.isArray(data?.transactions)) {
        return z.array(ServerTransactionSchema).parse(data.transactions);
      }
      if (Array.isArray(data)) {
        return z.array(ServerTransactionSchema).parse(data);
      }
      return [];
    },

    /**
     * Initiates a top-up intent on the server.
     * Returns PSP payment redirect or transaction reference.
     */
    async initiateTopUp(params: TopUpIntentParams): Promise<TopUpIntentResponse> {
      const payload = TopUpIntentParamsSchema.parse(params);
      try {
        const res = await client.post('/wallet/topup', payload);
        return TopUpIntentResponseSchema.parse(res.data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        return {
          success: false,
          intentId: '',
          error: axiosErr.response?.data?.error || axiosErr.message || 'Top-up failed',
        };
      }
    },

    /**
     * Fetches live market FX rates (USD, EUR, AED, CNY, RUB vs IRR).
     */
    async getFxRates(): Promise<Record<string, string>> {
      const res = await client.get('/fx/rates');
      if (res.data?.rates && typeof res.data.rates === 'object') {
        return res.data.rates as Record<string, string>;
      }
      if (res.data && typeof res.data === 'object') {
        return res.data as Record<string, string>;
      }
      throw new Error('Invalid FX rates response from server');
    },
  };
}

export type WalletService = ReturnType<typeof createWalletService>;
