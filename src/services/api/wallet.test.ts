import { describe, it, expect, vi } from 'vitest';
import { createWalletService } from './wallet';
import type { AxiosInstance } from 'axios';

describe('Wallet API Service (Double-Entry Ledger Integration)', () => {
  it('fetches authoritative balances from server', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          USD: '1450.00',
          IRR: '870000000',
          EUR: '120.00',
          AED: '500.00',
          CNY: '0.00',
          RUB: '0.00',
          usdIrrRate: '600000',
          loyaltyPoints: 340,
          loyaltyTier: 'SILVER',
          lastSyncedAt: '2026-09-26T12:00:00Z',
        },
      }),
    } as unknown as AxiosInstance;

    const service = createWalletService(mockAxios);
    const balances = await service.getBalances();

    expect(balances.USD).toBe('1450.00');
    expect(balances.IRR).toBe('870000000');
    expect(balances.loyaltyTier).toBe('SILVER');
    expect(balances.loyaltyPoints).toBe(340);
  });

  it('fetches server ledger transactions', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          transactions: [
            {
              id: 'tx-ledger-1',
              title: 'Mahan Air Ticket',
              date: '2026-09-26T10:00:00Z',
              amount: '-45.00',
              currency: 'USD',
              category: 'flight',
              status: 'SETTLED',
            },
          ],
        },
      }),
    } as unknown as AxiosInstance;

    const service = createWalletService(mockAxios);
    const txs = await service.getTransactions();

    expect(txs).toHaveLength(1);
    expect(txs[0]?.title).toBe('Mahan Air Ticket');
    expect(txs[0]?.status).toBe('SETTLED');
  });

  it('initiates top-up intent on server', async () => {
    const mockAxios = {
      post: vi.fn().mockResolvedValue({
        data: {
          success: true,
          intentId: 'intent_9918',
          gatewayReference: 'SHETAB_REF_882',
        },
      }),
    } as unknown as AxiosInstance;

    const service = createWalletService(mockAxios);
    const res = await service.initiateTopUp({
      amount: '100.00',
      currency: 'USD',
      method: 'shetab',
      idempotencyKey: 'idem-topup-uuid',
    });

    expect(res.success).toBe(true);
    expect(res.intentId).toBe('intent_9918');
  });

  it('fetches live FX rates', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          rates: {
            USD_IRR: '610000',
            EUR_IRR: '660000',
          },
        },
      }),
    } as unknown as AxiosInstance;

    const service = createWalletService(mockAxios);
    const rates = await service.getFxRates();

    expect(rates.USD_IRR).toBe('610000');
    expect(rates.EUR_IRR).toBe('660000');
  });
});
