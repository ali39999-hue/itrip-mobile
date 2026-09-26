import { describe, it, expect } from 'vitest';
import { priceBooking, convertBreakdown } from './pricing';
import { money } from '../currency/money';

describe('Pricing engine — server-mirrored fare math', () => {
  it('computes base + 9% tax + 5% fee for one passenger', () => {
    const b = priceBooking(money('100.00', 'USD'), 1);
    expect(b.base.amount.toFixed(2)).toBe('100.00');
    expect(b.tax.amount.toFixed(2)).toBe('9.00');
    expect(b.serviceFee.amount.toFixed(2)).toBe('5.00');
    expect(b.total.amount.toFixed(2)).toBe('114.00');
  });

  it('multiplies per-pax base by passenger count before percentages', () => {
    const b = priceBooking(money('45.50', 'USD'), 3);
    expect(b.base.amount.toFixed(2)).toBe('136.50');
    expect(b.tax.amount.toFixed(2)).toBe('12.29');
    expect(b.serviceFee.amount.toFixed(2)).toBe('6.83');
    expect(b.total.amount.toFixed(2)).toBe('155.62');
  });

  it('applies markup before percentages', () => {
    const b = priceBooking(money('100.00', 'USD'), 1, {
      taxPercent: '9',
      serviceFeePercent: '5',
      markupPerPax: '10',
    });
    expect(b.base.amount.toFixed(2)).toBe('110.00');
    expect(b.tax.amount.toFixed(2)).toBe('9.90');
    expect(b.serviceFee.amount.toFixed(2)).toBe('5.50');
    expect(b.total.amount.toFixed(2)).toBe('125.40');
  });

  it('rounds IRR to zero decimal places', () => {
    const b = priceBooking(money('1000000', 'IRR'), 1);
    expect(b.tax.amount.toFixed(0)).toBe('90000');
    expect(b.total.amount.toFixed(0)).toBe('1140000');
  });

  it('supports custom percent rules (zero tax)', () => {
    const b = priceBooking(money('80.00', 'EUR'), 2, {
      taxPercent: '0',
      serviceFeePercent: '3',
    });
    expect(b.tax.amount.toFixed(2)).toBe('0.00');
    expect(b.serviceFee.amount.toFixed(2)).toBe('4.80');
    expect(b.total.amount.toFixed(2)).toBe('164.80');
  });

  it('rejects invalid passenger counts', () => {
    expect(() => priceBooking(money('10', 'USD'), 0)).toThrow(/Invalid passenger/);
    expect(() => priceBooking(money('10', 'USD'), 1.5)).toThrow(/Invalid passenger/);
  });

  it('converts a breakdown wholesale at one rate', () => {
    const usd = priceBooking(money('100.00', 'USD'), 1);
    const irr = convertBreakdown(usd, '600000', 'IRR');
    expect(irr.total.currency).toBe('IRR');
    expect(irr.total.amount.toFixed(0)).toBe('68400000');
  });
});
