import { describe, it, expect } from 'vitest';
import {
  TourModelSchema,
  TourBookingDraftSchema,
  calculateTourTotal,
  calculateTourDeposit,
  isTourDepartureAvailable,
  formatTourDuration,
  type TourModel,
} from './tour';

const mockTour: TourModel = {
  id: 'tour-isfahan-3d',
  title: 'Isfahan Cultural Heritage Tour',
  titleFa: 'تور فرهنگی و تاریخی اصفهان',
  slug: 'isfahan-cultural-3d',
  city: 'Isfahan',
  countryCode: 'IR',
  category: 'CULTURAL',
  description: 'Explore Naghsh-e Jahan Square, Si-o-se-pol, and Vank Cathedral.',
  durationDays: 3,
  durationNights: 2,
  basePrice: '15000000',
  currency: 'IRR',
  depositAllowed: true,
  depositPercent: 30,
  ratingAvg: 4.9,
  ratingCount: 42,
  executionModels: ['group', 'private'],
  hotelTiers: ['ECO', 'STD', 'LUX'],
  itinerary: [
    {
      day: 1,
      title: 'Arrival & Grand Bazaar',
      titleFa: 'ورود و گشت بازار بزرگ',
      description: 'Check-in to hotel and evening walk at Si-o-se-pol.',
      meals: ['Dinner'],
      activities: ['Si-o-se-pol walk'],
      hotelName: 'Abbasi Hotel',
    },
    {
      day: 2,
      title: 'Naghsh-e Jahan UNESCO Site',
      titleFa: 'میدان نقش جهان و مساجد تاریخی',
      description: 'Ali Qapu, Sheikh Lotfollah and Shah Mosque tour.',
      meals: ['Breakfast', 'Lunch'],
      activities: ['Historical guided tour'],
      hotelName: 'Abbasi Hotel',
    },
    {
      day: 3,
      title: 'Jolfa Armenian Quarter & Departure',
      titleFa: 'محله جلفا و کلیسای وانک',
      description: 'Vank Cathedral visit, afternoon transfer.',
      meals: ['Breakfast'],
      activities: ['Vank Cathedral'],
    },
  ],
  includedServices: ['Hotel', 'Breakfast', 'Licensed Guide', 'Transfers'],
  excludedServices: ['Personal expenses', 'Tips'],
  departures: [
    {
      date: '2026-10-10',
      capacity: 15,
      remaining: 8,
      priceModifier: 1.0,
      isGuaranteed: true,
    },
    {
      date: '2026-10-25',
      capacity: 15,
      remaining: 2,
      priceModifier: 1.15,
      isGuaranteed: false,
    },
  ],
  gallery: [],
  tags: ['UNESCO', 'History', 'Architecture'],
};

describe('Tour Domain', () => {
  it('validates a complete tour schema', () => {
    const parsed = TourModelSchema.parse(mockTour);
    expect(parsed.id).toBe('tour-isfahan-3d');
    expect(parsed.durationDays).toBe(3);
    expect(parsed.itinerary).toHaveLength(3);
  });

  it('validates tour booking draft schema', () => {
    const draft = TourBookingDraftSchema.parse({
      tourId: 'tour-isfahan-3d',
      departureDate: '2026-10-10',
      travelers: 2,
      executionModel: 'group',
      hotelTier: 'STD',
    });
    expect(draft.travelers).toBe(2);
    expect(draft.hotelTier).toBe('STD');
  });

  it('calculates standard group tour total correctly', () => {
    const draft = {
      tourId: mockTour.id,
      departureDate: '2026-10-10',
      travelers: 2,
      executionModel: 'group' as const,
      hotelTier: 'STD' as const,
    };
    const total = calculateTourTotal(mockTour, draft);
    // 15,000,000 * 1.0 (STD) * 1.0 (group) * 1.0 (dep) * 2 = 30,000,000
    expect(total.amount.toString()).toBe('30000000');
    expect(total.currency).toBe('IRR');
  });

  it('applies luxury tier and private execution multipliers', () => {
    const draft = {
      tourId: mockTour.id,
      departureDate: '2026-10-10',
      travelers: 1,
      executionModel: 'private' as const,
      hotelTier: 'LUX' as const,
    };
    const total = calculateTourTotal(mockTour, draft);
    // 15,000,000 * 1.45 (LUX) * 1.35 (private) = 29,362,500
    expect(total.amount.toString()).toBe('29362500');
  });

  it('calculates 30% deposit correctly', () => {
    const draft = {
      tourId: mockTour.id,
      departureDate: '2026-10-10',
      travelers: 2,
      executionModel: 'group' as const,
      hotelTier: 'STD' as const,
    };
    const total = calculateTourTotal(mockTour, draft);
    const deposit = calculateTourDeposit(total, 30);
    // 30,000,000 * 0.3 = 9,000,000
    expect(deposit.amount.toString()).toBe('9000000');
  });

  it('rounds USD totals and deposits at 2 decimals so cents are preserved', () => {
    const usdTour: TourModel = { ...mockTour, basePrice: '100.10', currency: 'USD' };
    const draft = {
      tourId: usdTour.id,
      departureDate: '2026-10-10',
      travelers: 3,
      executionModel: 'group' as const,
      hotelTier: 'STD' as const,
    };
    const total = calculateTourTotal(usdTour, draft);
    // 100.10 * 1.0 (STD) * 1.0 (group) * 1.0 (dep) * 3 = 300.30 → rounded at 2 dp (never integer truncation to 300)
    expect(total.amount.toFixed(2)).toBe('300.30');
    expect(total.currency).toBe('USD');

    const deposit = calculateTourDeposit(total, 30);
    // 300.30 * 30% = 90.09 → ROUND_HALF_UP at 2 dp
    expect(deposit.amount.toString()).toBe('90.09');
  });

  it('checks departure availability accurately', () => {
    const dep1 = mockTour.departures[0]!;
    expect(isTourDepartureAvailable(dep1, 5)).toBe(true);
    expect(isTourDepartureAvailable(dep1, 10)).toBe(false);

    const dep2 = mockTour.departures[1]!;
    expect(isTourDepartureAvailable(dep2, 2)).toBe(true);
    expect(isTourDepartureAvailable(dep2, 3)).toBe(false);
  });

  it('formats duration in English and Persian', () => {
    expect(formatTourDuration(3, 2, false)).toBe('3 Days / 2 Nights');
    expect(formatTourDuration(1, 0, false)).toBe('1 Day / 0 Nights');
    expect(formatTourDuration(3, 2, true)).toBe('3 روز / 2 شب');
  });
});
