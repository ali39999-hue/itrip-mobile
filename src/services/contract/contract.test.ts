import { describe, it, expect } from 'vitest';
import {
  CustomerIdentitySchema,
  EntitlementsSchema,
  BookingIdentitySchema,
  CONTRACT_VERSION,
  isCompatibleServerContract,
  DEEP_LINK_ROUTES,
  SharedCurrencySchema,
} from './contract';

const validIdentity = {
  userId: 'usr-1',
  customerId: 'cust-77',
  kyc: 'APPROVED',
  country: 'IR',
  locale: 'fa',
  timezone: 'Asia/Tehran',
  walletAccounts: [{ id: 'wal-1', currency: 'IRR' }],
};

describe('Firuzo contract registry (R11)', () => {
  it('parses a complete Customer 360 identity', () => {
    const id = CustomerIdentitySchema.parse(validIdentity);
    expect(id.kyc).toBe('APPROVED');
    expect(id.walletAccounts[0]!.currency).toBe('IRR');
  });

  it('rejects a 3-letter country or unknown currency (contract drift fails here)', () => {
    expect(
      CustomerIdentitySchema.safeParse({ ...validIdentity, country: 'IRN' }).success,
    ).toBe(false);
    expect(
      SharedCurrencySchema.safeParse('GBP').success,
    ).toBe(false);
  });

  it('rejects non-IANA timezones', () => {
    expect(
      CustomerIdentitySchema.safeParse({ ...validIdentity, timezone: 'Tehran' }).success,
    ).toBe(false);
  });

  it('validates entitlements and booking identity trios', () => {
    const ent = EntitlementsSchema.parse({
      wallet: true, payments: true, escrow: true,
      visa: true, tours: true, rentals: true, esim: true,
    });
    expect(ent.wallet).toBe(true);

    const bi = BookingIdentitySchema.parse({
      bookingId: 'bk-1', reference: 'ITR-FL-1', paymentId: 'pay-1',
    });
    expect(bi.pnr).toBeUndefined();
  });

  it('contract version negotiation accepts same major/greater minor', () => {
    expect(CONTRACT_VERSION).toBe('1.0.0');
    expect(isCompatibleServerContract('1.0.0')).toBe(true);
    expect(isCompatibleServerContract('1.2.3')).toBe(true);
    expect(isCompatibleServerContract('2.0.0')).toBe(false); // breaking major
    expect(isCompatibleServerContract('0.9.0')).toBe(false); // older minor
  });

  it('deep-link routes match the native manifest schemes', () => {
    expect(DEEP_LINK_ROUTES.trip('ITR-1')).toBe('itrip://trip/ITR-1');
    expect(DEEP_LINK_ROUTES.booking('ITR-1')).toBe('itrip://booking/ITR-1');
    expect(DEEP_LINK_ROUTES.wallet()).toBe('itrip://wallet');
    expect(DEEP_LINK_ROUTES.support('T-9')).toBe('itrip://support/T-9');
  });
});
