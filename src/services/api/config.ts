export const apiConfig = {
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  /** Domains allowed for certificate pinning once the native module is wired. */
  pinnedDomains: [] as string[],
} as const;
