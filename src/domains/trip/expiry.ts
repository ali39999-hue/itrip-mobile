/**
 * Document expiry alerts (R5 — Travel Vault + In-Trip Mode).
 *
 * Pure policy: given "today", classify every dated document the vault
 * knows about (passports in saved travelers / passengers, visa
 * applications, insurance) into alert buckets. The UI maps buckets to
 * badges; the notification scheduler uses it to decide what to push.
 *
 * Buckets:
 *  EXPIRED      — past expiry: unusable, block booking flows
 *  CRITICAL     — < 90 days validity: book only with renewal plan
 *  WARNING      — < 180 days (6-month rule at risk)
 *  OK           — comfortably valid
 */

export type ExpiryBucket = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK';

export interface ExpiryAlert {
  documentType: 'PASSPORT' | 'VISA' | 'INSURANCE';
  /** Owner label for display (traveler name or doc id). */
  owner: string;
  expiryDate: string; // YYYY-MM-DD
  bucket: ExpiryBucket;
  daysRemaining: number;
}

export const EXPIRY_THRESHOLDS = {
  CRITICAL_DAYS: 90,
  WARNING_DAYS: 180,
} as const;

export function classifyExpiry(expiryDate: string, now = new Date()): ExpiryBucket {
  const expiry = new Date(expiryDate + 'T00:00:00Z');
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const days = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'EXPIRED';
  if (days <= EXPIRY_THRESHOLDS.CRITICAL_DAYS) return 'CRITICAL';
  if (days <= EXPIRY_THRESHOLDS.WARNING_DAYS) return 'WARNING';
  return 'OK';
}

export function buildExpiryAlert(
  documentType: ExpiryAlert['documentType'],
  owner: string,
  expiryDate: string,
  now = new Date(),
): ExpiryAlert {
  const expiry = new Date(expiryDate + 'T00:00:00Z');
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const daysRemaining = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
  return {
    documentType,
    owner,
    expiryDate,
    bucket: classifyExpiry(expiryDate, now),
    daysRemaining,
  };
}

/** Only alerts that need attention (EXPIRED/CRITICAL/WARNING), sorted worst-first. */
export function actionableAlerts(alerts: ExpiryAlert[]): ExpiryAlert[] {
  const order: Record<ExpiryBucket, number> = {
    EXPIRED: 0,
    CRITICAL: 1,
    WARNING: 2,
    OK: 3,
  };
  return alerts
    .filter((a) => a.bucket !== 'OK')
    .sort((a, b) => order[a.bucket] - order[b.bucket] || a.daysRemaining - b.daysRemaining);
}
