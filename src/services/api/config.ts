/**
 * Central API & Security Configuration.
 *
 * Implements Phase 8 (Security) and Phase 9 (Certificate Pinning):
 * - Target production, staging, and development host endpoints.
 * - SPKI SHA-256 public key pins with backup rotation keys (RFC 7469).
 * - Debug mode disables pinning to allow local proxying / development inspection.
 */

export interface DomainPinningPolicy {
  domain: string;
  /** Subject Public Key Info (SPKI) SHA-256 fingerprints */
  pins: string[];
}

export const apiConfig = {
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  appVersion: '0.2.0',
  platform: 'android',
  /**
   * Pinned domain policies with active + backup keys for zero-downtime certificate rotation.
   * Format: base64-encoded SHA-256 of the Subject Public Key Info.
   */
  pinnedDomains: [
    {
      domain: 'api.itrip.example.com',
      pins: [
        'sha256/WoiWRyIOVNa9ihaBciRSC7XHjliYS9VwUGOIud4PB18=', // Primary leaf cert pin
        'sha256/r/m0WaNuukvfVeh6BaR2HIINJflLR9Hkzvxhn5gkGOm=', // Backup intermediate CA pin
      ],
    },
    {
      domain: 'itrip-platform.vercel.app',
      pins: [
        'sha256/kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=', // Primary Vercel edge pin
        'sha256/18tkP1CuRPfqlmm52Y5SuL47Wbe5cTewl3/hSnoR5CY=', // Backup DigiCert/Let's Encrypt pin
      ],
    },
  ] as DomainPinningPolicy[],
  /** Whether SSL certificate pinning is enforced (production builds only) */
  pinningEnforced: process.env.NODE_ENV === 'production',
} as const;
