import { describe, it, expect } from 'vitest';
import {
  classifyExpiry,
  buildExpiryAlert,
  actionableAlerts,
  EXPIRY_THRESHOLDS,
  type ExpiryAlert,
} from './expiry';

const NOW = new Date('2026-09-30T12:00:00Z');

describe('Document expiry alerts (R5)', () => {
  it('thresholds match the 6-month travel rule context', () => {
    expect(EXPIRY_THRESHOLDS.CRITICAL_DAYS).toBe(90);
    expect(EXPIRY_THRESHOLDS.WARNING_DAYS).toBe(180);
  });

  it('classifies EXPIRED for past dates', () => {
    expect(classifyExpiry('2026-01-01', NOW)).toBe('EXPIRED');
  });

  it('classifies CRITICAL under 90 days', () => {
    expect(classifyExpiry('2026-12-15', NOW)).toBe('CRITICAL'); // ~76 days
  });

  it('classifies WARNING between 90 and 180 days', () => {
    expect(classifyExpiry('2027-02-01', NOW)).toBe('WARNING'); // ~124 days
  });

  it('classifies OK beyond 180 days', () => {
    expect(classifyExpiry('2027-07-01', NOW)).toBe('OK');
  });

  it('buildExpiryAlert computes daysRemaining correctly', () => {
    const alert = buildExpiryAlert('PASSPORT', 'Sara Karimi', '2027-03-29', NOW);
    expect(alert.daysRemaining).toBe(180);
    expect(alert.bucket).toBe('WARNING');
    expect(alert.owner).toBe('Sara Karimi');
  });

  it('actionableAlerts drops OK items and sorts worst-first', () => {
    const alerts: ExpiryAlert[] = [
      buildExpiryAlert('PASSPORT', 'Ali', '2027-07-01', NOW), // OK
      buildExpiryAlert('VISA', 'Mum', '2026-10-10', NOW), // CRITICAL (10d)
      buildExpiryAlert('PASSPORT', 'Sara', '2026-10-05', NOW), // CRITICAL (5d)
      buildExpiryAlert('INSURANCE', 'Dad', '2026-01-15', NOW), // EXPIRED
    ];
    const actionable = actionableAlerts(alerts);
    expect(actionable).toHaveLength(3);
    expect(actionable[0]!.bucket).toBe('EXPIRED');
    expect(actionable[0]!.owner).toBe('Dad');
    expect(actionable[1]!.owner).toBe('Sara'); // 5 days before Mum's 10
    expect(actionable[2]!.owner).toBe('Mum');
  });
});
