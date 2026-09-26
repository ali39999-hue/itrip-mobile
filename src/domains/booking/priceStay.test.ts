import { describe, it, expect } from 'vitest';
import { priceStay, priceBooking, priceFromBase } from './pricing';
import { money } from '../currency/money';

/**
 * Hotel pricing tests — the financial invariants for a stay:
 * base = nightly × nights × rooms, then tax/fee on the rounded base.
 */
describe('priceStay', () => {
  it('multiplies nightly rate by nights and rooms', () => {
    const bd = priceStay(money('50.00', 'USD'), 3, 1);
    expect(bd.base.amount.toFixed(2)).toBe('150.00');
  });

  it('multiplies by room count too', () => {
    const bd = priceStay(money('50.00', 'USD'), 3, 2);
    expect(bd.base.amount.toFixed(2)).toBe('300.00');
  });

  it('applies the default 9% tax and 5% service fee', () => {
    // base 100.00 (2 nights × 1 room × 50.00)
    const bd = priceStay(money('50.00', 'USD'), 2, 1);
    expect(bd.base.amount.toFixed(2)).toBe('100.00');
    expect(bd.tax.amount.toFixed(2)).toBe('9.00');
    expect(bd.serviceFee.amount.toFixed(2)).toBe('5.00');
    expect(bd.total.amount.toFixed(2)).toBe('114.00');
  });

  it('keeps total as the exact sum of its rounded parts', () => {
    const bd = priceStay(money('33.33', 'USD'), 3, 3);
    const sum = bd.base.amount.plus(bd.tax.amount).plus(bd.serviceFee.amount);
    expect(bd.total.amount.eq(sum)).toBe(true);
  });

  it('rounds IRR to whole rials (0 decimal places)', () => {
    const bd = priceStay(money('1500000', 'IRR'), 2, 1);
    expect(bd.base.amount.toFixed(0)).toBe('3000000');
    expect(bd.total.amount.decimalPlaces()).toBe(0);
  });

  it('never produces float drift on awkward rates', () => {
    // 0.1 + 0.2 style trap: 19.99 × 7 nights
    const bd = priceStay(money('19.99', 'USD'), 7, 1);
    expect(bd.base.amount.toFixed(2)).toBe('139.93');
  });

  it('rejects a non-integer or zero night count', () => {
    expect(() => priceStay(money('50', 'USD'), 0, 1)).toThrow();
    expect(() => priceStay(money('50', 'USD'), 2.5, 1)).toThrow();
  });

  it('rejects a non-integer or zero room count', () => {
    expect(() => priceStay(money('50', 'USD'), 2, 0)).toThrow();
    expect(() => priceStay(money('50', 'USD'), 2, 1.5)).toThrow();
  });
});

describe('priceFromBase', () => {
  it('matches priceBooking for the equivalent base', () => {
    const viaBooking = priceBooking(money('50.00', 'USD'), 2);
    const viaBase = priceFromBase(money('100.00', 'USD'));
    expect(viaBase.total.amount.eq(viaBooking.total.amount)).toBe(true);
  });
});
