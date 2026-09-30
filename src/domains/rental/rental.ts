import { z } from 'zod';
import Decimal from 'decimal.js';
import { money, type Money, type CurrencyCode } from '@/domains/currency/money';

/**
 * Rental & Transfer Domain — airport taxis, fleet cars, and private transfers.
 * Mirrored and upgraded from eCardo Rental Services.
 */

export const VehicleCategorySchema = z.enum(['ECONOMY', 'COMFORT', 'SUV', 'VAN', 'LUXURY']);
export type VehicleCategory = z.infer<typeof VehicleCategorySchema>;

export const TransmissionSchema = z.enum(['AUTO', 'MANUAL']);
export type Transmission = z.infer<typeof TransmissionSchema>;

export const InsuranceTierSchema = z.enum(['BASIC', 'STANDARD', 'COMPREHENSIVE']);
export type InsuranceTier = z.infer<typeof InsuranceTierSchema>;

export const INSURANCE_MULTIPLIERS: Record<InsuranceTier, number> = {
  BASIC: 1.0,
  STANDARD: 1.15,
  COMPREHENSIVE: 1.3,
};

export const CarModelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  titleFa: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  category: VehicleCategorySchema,
  transmission: TransmissionSchema.default('AUTO'),
  dailyPrice: z.string().regex(/^\d+(\.\d+)?$/),
  depositAmount: z.string().regex(/^\d+(\.\d+)?$/),
  currency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  dailyKmLimit: z.number().int().min(50).default(250),
  extraKmRate: z.string().regex(/^\d+(\.\d+)?$/).default('15000'),
  minAge: z.number().int().min(18).default(21),
  minLicenseYears: z.number().int().min(1).default(2),
  pickupLocation: z.string().min(1),
  seats: z.number().int().min(2).max(15).default(5),
  withDriverAvailable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export type CarModel = z.infer<typeof CarModelSchema>;

export const RentalBookingDraftSchema = z.object({
  carId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupLocation: z.string().min(1),
  dropoffLocation: z.string().min(1),
  insuranceTier: InsuranceTierSchema.default('BASIC'),
  driverAge: z.number().int().min(18),
  licenseYears: z.number().int().min(0),
  withDriver: z.boolean().default(false),
});
export type RentalBookingDraft = z.infer<typeof RentalBookingDraftSchema>;

export function calculateRentalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  const diffMs = end.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(days, 1);
}

export function isDriverEligible(
  car: CarModel,
  driverAge: number,
  licenseYears: number,
  withDriver: boolean,
): { eligible: boolean; reason?: string } {
  if (withDriver) {
    return { eligible: true };
  }
  if (driverAge < car.minAge) {
    return {
      eligible: false,
      reason: `Minimum required age for self-drive is ${car.minAge} years old.`,
    };
  }
  if (licenseYears < car.minLicenseYears) {
    return {
      eligible: false,
      reason: `Minimum driving experience required is ${car.minLicenseYears} years.`,
    };
  }
  return { eligible: true };
}

export function calculateRentalPricing(
  car: CarModel,
  draft: RentalBookingDraft,
): {
  days: number;
  rentalFee: Money;
  deposit: Money;
  totalPayable: Money;
} {
  const days = calculateRentalDays(draft.startDate, draft.endDate);
  const baseRate = new Decimal(car.dailyPrice);
  const insMult = new Decimal(INSURANCE_MULTIPLIERS[draft.insuranceTier] ?? 1.0);
  const driverSurcharge = draft.withDriver ? new Decimal(5000000) : new Decimal(0); // Daily driver fee

  const dailyTotal = baseRate.times(insMult).plus(driverSurcharge);
  const rentalAmount = dailyTotal.times(days).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const depositAmount = draft.withDriver ? new Decimal(0) : new Decimal(car.depositAmount);

  const curr = car.currency as CurrencyCode;
  const rentalFee = money(rentalAmount, curr);
  const deposit = money(depositAmount, curr);
  const totalPayable = money(rentalAmount.plus(depositAmount), curr);

  return {
    days,
    rentalFee,
    deposit,
    totalPayable,
  };
}
