import { describe, it, expect } from 'vitest';
import { money, add, sub, mul, convert, format, zero, isEqual } from './money';
import Decimal from 'decimal.js';

describe('Money and Currency Domain Engine', () => {
  it('prevents floating point errors (e.g. 0.1 + 0.2 = 0.3)', () => {
    const a = money('0.1', 'USD');
    const b = money('0.2', 'USD');
    const sum = add(a, b);
    expect(sum.amount.toString()).toBe('0.3');
  });

  it('correctly adds and subtracts with same currency', () => {
    const a = money('100.50', 'USD');
    const b = money('25.25', 'USD');

    const added = add(a, b);
    expect(added.amount.toString()).toBe('125.75');
    expect(added.currency).toBe('USD');

    const subtracted = sub(a, b);
    expect(subtracted.amount.toString()).toBe('75.25');
  });

  it('throws on currency mismatch during add/sub', () => {
    const usd = money('100', 'USD');
    const irr = money('60000000', 'IRR');

    expect(() => add(usd, irr)).toThrowError(/Currency mismatch/);
    expect(() => sub(usd, irr)).toThrowError(/Currency mismatch/);
  });

  it('multiplies by quantity', () => {
    const ticketPrice = money('45.50', 'USD');
    const total = mul(ticketPrice, 3);
    expect(total.amount.toString()).toBe('136.5');
  });

  it('converts currencies using provided exchange rate', () => {
    const usd = money('10', 'USD');
    const rate = '600000'; // 1 USD = 600,000 IRR
    const irr = convert(usd, rate, 'IRR');

    expect(irr.currency).toBe('IRR');
    expect(irr.amount.toString()).toBe('6000000');
  });

  it('creates zero amount for given currency', () => {
    const z = zero('EUR');
    expect(z.currency).toBe('EUR');
    expect(z.amount.isZero()).toBe(true);
  });

  it('compares equality accurately', () => {
    const a = money('50.00', 'USD');
    const b = money('50', 'USD');
    const c = money('50.00', 'EUR');

    expect(isEqual(a, b)).toBe(true);
    expect(isEqual(a, c)).toBe(false);
  });
});
