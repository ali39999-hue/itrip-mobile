import { describe, it, expect } from 'vitest';
import {
  CarModelSchema,
  RentalBookingDraftSchema,
  calculateRentalDays,
  isDriverEligible,
  calculateRentalPricing,
  type CarModel,
} from './rental';

const mockCar: CarModel = {
  id: 'car-tucson-2024',
  title: 'Hyundai Tucson 2024',
  titleFa: 'هیوندای توسان ۲۰۲۴',
  brand: 'Hyundai',
  model: 'Tucson',
  category: 'SUV',
  transmission: 'AUTO',
  dailyPrice: '20000000',
  depositAmount: '100000000',
  currency: 'IRR',
  dailyKmLimit: 250,
  extraKmRate: '25000',
  minAge: 23,
  minLicenseYears: 2,
  pickupLocation: 'Tehran (IKA Airport)',
  seats: 5,
  withDriverAvailable: true,
  isActive: true,
};

describe('Rental & Transfer Domain', () => {
  it('validates a complete car model schema', () => {
    const parsed = CarModelSchema.parse(mockCar);
    expect(parsed.id).toBe('car-tucson-2024');
    expect(parsed.category).toBe('SUV');
  });

  it('calculates rental duration in days correctly', () => {
    expect(calculateRentalDays('2026-10-01', '2026-10-04')).toBe(3);
    expect(calculateRentalDays('2026-10-01', '2026-10-01')).toBe(1);
  });

  it('evaluates driver eligibility rules', () => {
    // Under minimum age
    const underAge = isDriverEligible(mockCar, 21, 3, false);
    expect(underAge.eligible).toBe(false);
    expect(underAge.reason).toContain('Minimum required age');

    // Inexperienced license
    const lowExp = isDriverEligible(mockCar, 25, 1, false);
    expect(lowExp.eligible).toBe(false);
    expect(lowExp.reason).toContain('Minimum driving experience');

    // Valid driver
    const valid = isDriverEligible(mockCar, 26, 4, false);
    expect(valid.eligible).toBe(true);

    // With driver bypasses age restriction
    const withDriver = isDriverEligible(mockCar, 20, 0, true);
    expect(withDriver.eligible).toBe(true);
  });

  it('calculates rental fees and deposits correctly', () => {
    const draft = RentalBookingDraftSchema.parse({
      carId: 'car-tucson-2024',
      startDate: '2026-10-01',
      endDate: '2026-10-04',
      pickupLocation: 'IKA',
      dropoffLocation: 'IKA',
      insuranceTier: 'STANDARD', // 1.15 multiplier
      driverAge: 28,
      licenseYears: 5,
      withDriver: false,
    });

    const pricing = calculateRentalPricing(mockCar, draft);
    expect(pricing.days).toBe(3);
    // Daily: 20,000,000 * 1.15 = 23,000,000
    // Total rental: 23,000,000 * 3 = 69,000,000
    expect(pricing.rentalFee.amount.toString()).toBe('69000000');
    // Deposit: 100,000,000
    expect(pricing.deposit.amount.toString()).toBe('100000000');
    // Total payable: 69,000,000 + 100,000,000 = 169,000,000
    expect(pricing.totalPayable.amount.toString()).toBe('169000000');
  });

  it('waives deposit when booked with driver', () => {
    const draft = RentalBookingDraftSchema.parse({
      carId: 'car-tucson-2024',
      startDate: '2026-10-01',
      endDate: '2026-10-03',
      pickupLocation: 'IKA',
      dropoffLocation: 'IKA',
      insuranceTier: 'BASIC',
      driverAge: 25,
      licenseYears: 3,
      withDriver: true,
    });

    const pricing = calculateRentalPricing(mockCar, draft);
    expect(pricing.days).toBe(2);
    expect(pricing.deposit.amount.toString()).toBe('0');
    // Daily: 20,000,000 (basic) + 5,000,000 (driver) = 25,000,000 * 2 = 50,000,000
    expect(pricing.rentalFee.amount.toString()).toBe('50000000');
    expect(pricing.totalPayable.amount.toString()).toBe('50000000');
  });
});
