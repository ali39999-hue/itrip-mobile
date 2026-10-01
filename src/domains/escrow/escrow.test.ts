import { describe, it, expect } from 'vitest';
import {
  EscrowContractSchema,
  canTransitionEscrow,
  calculateEscrowFee,
  calculateTotalEscrowDeposit,
  type EscrowContract,
} from './escrow';
import { money } from '@/domains/currency/money';

const mockContract: EscrowContract = {
  id: 'escrow-9081',
  contractNo: 'ESC-2026-0019',
  title: 'Custom Desert VIP Tour Escrow',
  titleFa: 'قرارداد امانی تور VIP کویر',
  buyerId: 'user-traveler-1',
  sellerId: 'user-agency-9',
  amount: '50000000',
  currency: 'IRR',
  feeAmount: '750000',
  status: 'CREATED',
  inspectionPeriodDays: 3,
  createdAt: '2026-09-30T10:00:00Z',
};

describe('Escrow Domain', () => {
  it('validates a complete escrow contract schema', () => {
    const parsed = EscrowContractSchema.parse(mockContract);
    expect(parsed.contractNo).toBe('ESC-2026-0019');
    expect(parsed.status).toBe('CREATED');
  });

  it('enforces valid state machine transitions', () => {
    expect(canTransitionEscrow('CREATED', 'FUNDED')).toBe(true);
    expect(canTransitionEscrow('CREATED', 'RELEASED')).toBe(false);

    expect(canTransitionEscrow('FUNDED', 'IN_FULFILLMENT')).toBe(true);
    expect(canTransitionEscrow('FUNDED', 'DISPUTED')).toBe(true);

    expect(canTransitionEscrow('FULFILLED', 'RELEASED')).toBe(true);
    expect(canTransitionEscrow('RELEASED', 'FUNDED')).toBe(false);
  });

  it('calculates escrow platform fee accurately', () => {
    const principal = money('100000000', 'IRR');
    const fee = calculateEscrowFee(principal, 1.5);
    // 100,000,000 * 1.5% = 1,500,000
    expect(fee.amount.toString()).toBe('1500000');
    expect(fee.currency).toBe('IRR');
  });

  it('rounds non-IRR fees to 2 decimals so cents are preserved', () => {
    const principal = money('1000.50', 'USD');
    const fee = calculateEscrowFee(principal, 1.5);
    // 1000.50 * 1.5% = 15.0075 → ROUND_HALF_UP at 2 dp = 15.01 (never the old integer truncation to 15)
    expect(fee.amount.toString()).toBe('15.01');
    expect(fee.currency).toBe('USD');
  });

  it('calculates total deposit required from buyer', () => {
    const principal = money('50000000', 'IRR');
    const fee = calculateEscrowFee(principal, 1.5); // 750,000
    const total = calculateTotalEscrowDeposit(principal, fee);
    expect(total.amount.toString()).toBe('50750000');
  });

  it('supports dispute attachment', () => {
    const contractWithDispute = EscrowContractSchema.parse({
      ...mockContract,
      status: 'DISPUTED',
      dispute: {
        caseNumber: 'DSP-8821',
        type: 'QUALITY_MISMATCH',
        description: 'Hotel provided did not match the agreed tier.',
        status: 'OPEN',
        openedAt: '2026-10-02T12:00:00Z',
      },
    });
    expect(contractWithDispute.dispute?.caseNumber).toBe('DSP-8821');
    expect(canTransitionEscrow('DISPUTED', 'RESOLVED_BUYER')).toBe(true);
  });
});
