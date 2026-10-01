import { z } from 'zod';
import Decimal from 'decimal.js';
import { money, type Money } from '@/domains/currency/money';
import { CURRENCY_PRECISION } from '@/domains/booking/pricing';

/**
 * Escrow Domain — secure payment vault, supplier escrow, and dispute arbitration.
 * Mirrored and upgraded from eCardo Escrow & Business Services.
 */

export const EscrowStatus = {
  CREATED: 'CREATED',
  FUNDED: 'FUNDED',
  IN_FULFILLMENT: 'IN_FULFILLMENT',
  FULFILLED: 'FULFILLED',
  RELEASED: 'RELEASED',
  DISPUTED: 'DISPUTED',
  RESOLVED_BUYER: 'RESOLVED_BUYER',
  RESOLVED_SELLER: 'RESOLVED_SELLER',
  CANCELLED: 'CANCELLED',
} as const;
export type EscrowStatus = (typeof EscrowStatus)[keyof typeof EscrowStatus];

export const EscrowStatusSchema = z.enum([
  'CREATED',
  'FUNDED',
  'IN_FULFILLMENT',
  'FULFILLED',
  'RELEASED',
  'DISPUTED',
  'RESOLVED_BUYER',
  'RESOLVED_SELLER',
  'CANCELLED',
]);

export const allowedEscrowTransitions: Record<EscrowStatus, readonly EscrowStatus[]> = {
  CREATED: ['FUNDED', 'CANCELLED'],
  FUNDED: ['IN_FULFILLMENT', 'CANCELLED', 'DISPUTED'],
  IN_FULFILLMENT: ['FULFILLED', 'DISPUTED'],
  FULFILLED: ['RELEASED', 'DISPUTED'],
  DISPUTED: ['RESOLVED_BUYER', 'RESOLVED_SELLER'],
  RELEASED: [],
  RESOLVED_BUYER: [],
  RESOLVED_SELLER: [],
  CANCELLED: [],
};

export function canTransitionEscrow(from: EscrowStatus, to: EscrowStatus): boolean {
  return allowedEscrowTransitions[from]?.includes(to) ?? false;
}

export const EscrowDisputeSchema = z.object({
  caseNumber: z.string().min(1),
  type: z.enum(['SERVICE_NOT_DELIVERED', 'QUALITY_MISMATCH', 'CANCELLATION_DISPUTE', 'FRAUD']),
  description: z.string().min(1),
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED']),
  openedAt: z.string(),
  resolution: z.string().optional(),
  resolvedAt: z.string().optional(),
});
export type EscrowDispute = z.infer<typeof EscrowDisputeSchema>;

export const EscrowContractSchema = z.object({
  id: z.string().min(1),
  contractNo: z.string().min(1),
  title: z.string().min(1),
  titleFa: z.string().min(1),
  buyerId: z.string().min(1),
  sellerId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  currency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  feeAmount: z.string().regex(/^\d+(\.\d+)?$/),
  status: EscrowStatusSchema,
  inspectionPeriodDays: z.number().int().min(1).default(3),
  dispute: EscrowDisputeSchema.optional(),
  createdAt: z.string(),
});
export type EscrowContract = z.infer<typeof EscrowContractSchema>;

/** Standard 1.5% escrow platform fee */
export const DEFAULT_ESCROW_FEE_PERCENT = 1.5;

/**
 * Calculates the escrow platform fee with currency-aware rounding
 * (AGENTS.md §5.3): ROUND_HALF_UP at CURRENCY_PRECISION of the principal
 * currency — 0 decimals for IRR, 2 for USD/EUR/AED/CNY/RUB — so fractional
 * cents in non-IRR currencies are preserved instead of being truncated.
 */
export function calculateEscrowFee(principal: Money, feePercent = DEFAULT_ESCROW_FEE_PERCENT): Money {
  const dp = CURRENCY_PRECISION[principal.currency] ?? 2;
  const factor = new Decimal(feePercent).dividedBy(100);
  const fee = principal.amount.times(factor).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
  return money(fee, principal.currency);
}

export function calculateTotalEscrowDeposit(principal: Money, fee: Money): Money {
  if (principal.currency !== fee.currency) {
    throw new Error('Principal and fee currencies must match');
  }
  return money(principal.amount.plus(fee.amount), principal.currency);
}
