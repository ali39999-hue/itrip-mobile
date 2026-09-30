import { z } from 'zod';

/**
 * Firuzo Contract Registry (R11 — Production Release + Integration).
 *
 * The shared identity between iTRIP Mobile and Firuzo Core, expressed
 * once as Zod so any drift between platforms breaks THIS build instead
 * of production. Mirrors MASTER_ROADMAP.md §14 "باید مشترک باشند".
 *
 * Shared entities (roadmap): User identity, Customer ID, Wallet account,
 * Booking ID, Trip ID, Voucher ID, Payment ID, Country, Currency, Locale,
 * Timezone, KYC status, feature entitlements.
 */

export const SharedCountrySchema = z.string().length(2); // ISO 3166-1 alpha-2
export type SharedCountry = z.infer<typeof SharedCountrySchema>;

export const SharedCurrencySchema = z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']);
export type SharedCurrency = z.infer<typeof SharedCurrencySchema>;

export const SharedLocaleSchema = z.enum(['fa', 'ar', 'en', 'zh', 'ru']);
export type SharedLocale = z.infer<typeof SharedLocaleSchema>;

export const SharedTimezoneSchema = z
  .string()
  .regex(/^[A-Za-z_]+\/[A-Za-z_+-]+$/, 'IANA zone, e.g. Asia/Tehran');
export type SharedTimezone = z.infer<typeof SharedTimezoneSchema>;

export const KycStatusSchema = z.enum([
  'NOT_SUBMITTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export type KycStatus = z.infer<typeof KycStatusSchema>;

/** Customer 360 identity the mobile app receives at session bootstrap. */
export const CustomerIdentitySchema = z.object({
  userId: z.string().min(1),
  customerId: z.string().min(1),
  kyc: KycStatusSchema,
  country: SharedCountrySchema,
  locale: SharedLocaleSchema,
  timezone: SharedTimezoneSchema,
  /** Wallet account ids the customer holds, per currency. */
  walletAccounts: z.array(
    z.object({ id: z.string().min(1), currency: SharedCurrencySchema }),
  ).min(1),
});
export type CustomerIdentity = z.infer<typeof CustomerIdentitySchema>;

/** Entitlements gate feature visibility per customer (feature flags). */
export const EntitlementsSchema = z.object({
  wallet: z.boolean(),
  payments: z.boolean(),
  escrow: z.boolean(),
  visa: z.boolean(),
  tours: z.boolean(),
  rentals: z.boolean(),
  esim: z.boolean(),
});
export type Entitlements = z.infer<typeof EntitlementsSchema>;

/** Booking identity trio that must line up across platforms. */
export const BookingIdentitySchema = z.object({
  bookingId: z.string().min(1),
  reference: z.string().min(1),
  pnr: z.string().optional(),
  paymentId: z.string().min(1),
  voucherId: z.string().optional(),
  tripId: z.string().optional(),
});
export type BookingIdentity = z.infer<typeof BookingIdentitySchema>;

/**
 * Contract-version negotiation: the mobile app declares the contract
 * versions it implements; a server response with an incompatible major
 * must be rejected before any parse happens.
 */
export const CONTRACT_VERSION = '1.0.0';

export function isCompatibleServerContract(serverVersion: string): boolean {
  const parse = (v: string) => {
    const [maj = '0', min = '0'] = v.split('.');
    return { major: Number(maj), minor: Number(min) };
  };
  const mine = parse(CONTRACT_VERSION);
  const theirs = parse(serverVersion);
  return theirs.major === mine.major && theirs.minor >= mine.minor;
}

/**
 * Deep-link scheme map — shared with Firuzo Web/ERP so every platform
 * emits the same routes into the app (roadmap §14: ERP deep links).
 */
export const DEEP_LINK_ROUTES = {
  trip: (ref: string) => `itrip://trip/${encodeURIComponent(ref)}`,
  booking: (ref: string) => `itrip://booking/${encodeURIComponent(ref)}`,
  wallet: () => 'itrip://wallet',
  support: (ticketId: string) => `itrip://support/${encodeURIComponent(ticketId)}`,
} as const;
