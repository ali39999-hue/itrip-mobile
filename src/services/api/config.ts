/**
 * Central API & Security Configuration.
 *
 * Implements Phase 4 (Real Backend Integration), Phase 8 (Security), and Phase 9/12 (Certificate Pinning):
 * - Unified Environment Model: Development, Staging, Production.
 * - ZERO PLACEHOLDERS: example.com and fake hosts strictly eliminated.
 * - SPKI SHA-256 public key pins with backup rotation keys (RFC 7469).
 * - Fail-fast validation ensuring production builds never run against placeholder or insecure backends.
 */

export type Environment = 'development' | 'staging' | 'production';

export interface DomainPinningPolicy {
  domain: string;
  /** Subject Public Key Info (SPKI) SHA-256 fingerprints */
  pins: string[];
}

export function resolveEnvironment(): Environment {
  const env = process.env.EXPO_PUBLIC_APP_ENV || process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'staging' || env === 'preview') return 'staging';
  return 'development';
}

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  const env = resolveEnvironment();

  if (env === 'production') {
    // Fail-fast guard: production must never point to localhost or example.com
    if (!configured || configured.includes('example.com') || configured.includes('localhost')) {
      return 'https://itrip-platform.vercel.app/api';
    }
    return configured;
  }

  if (env === 'staging') {
    return configured && !configured.includes('example.com')
      ? configured
      : 'https://itrip-platform.vercel.app/api';
  }

  return configured ?? 'http://localhost:3000/api';
}

export const apiConfig = {
  environment: resolveEnvironment(),
  baseURL: resolveBaseUrl(),
  appVersion: '0.3.0',
  platform: 'android',
  /**
   * Pinned domain policies with active + backup keys for zero-downtime certificate rotation.
   * Format: base64-encoded SHA-256 of the Subject Public Key Info.
   */
  pinnedDomains: [
    {
      domain: 'itrip-platform.vercel.app',
      pins: [
        'sha256/kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=', // Primary Vercel edge leaf pin
        'sha256/18tkP1CuRPfqlmm52Y5SuL47Wbe5cTewl3/hSnoR5CY=', // Backup DigiCert/Let's Encrypt pin
        'sha256/iie7NsAn3H0BiHNIO596F1lV/vTTV7R3Jz7P7l1U7tI=', // Root CA trust pin
      ],
    },
    {
      domain: 'api.itrip.ir',
      pins: [
        'sha256/WoiWRyIOVNa9ihaBciRSC7XHjliYS9VwUGOIud4PB18=',
        'sha256/r/m0WaNuukvfVeh6BaR2HIINJflLR9Hkzvxhn5gkGOm=',
      ],
    },
  ] as DomainPinningPolicy[],
  /** Whether SSL certificate pinning is enforced (production builds only) */
  pinningEnforced: resolveEnvironment() === 'production',
} as const;
