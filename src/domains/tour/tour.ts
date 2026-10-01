import { z } from 'zod';
import Decimal from 'decimal.js';
import { money, type Money, type CurrencyCode } from '@/domains/currency/money';
import { CURRENCY_PRECISION } from '@/domains/booking/pricing';

/**
 * Tour domain — guided itineraries, departures, and experiential packages.
 * Mirrored and upgraded from eCardo Travel Tour Architecture.
 */

export const TourExecutionModelSchema = z.enum(['group', 'private', 'custom']);
export type TourExecutionModel = z.infer<typeof TourExecutionModelSchema>;

export const TourHotelTierSchema = z.enum(['ECO', 'STD', 'LUX']);
export type TourHotelTier = z.infer<typeof TourHotelTierSchema>;

export const TourItineraryDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().min(1),
  titleFa: z.string().optional(),
  description: z.string().min(1),
  meals: z.array(z.string()).default([]),
  activities: z.array(z.string()).default([]),
  hotelName: z.string().optional(),
});
export type TourItineraryDay = z.infer<typeof TourItineraryDaySchema>;

export const TourDepartureSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Departure date must be YYYY-MM-DD'),
  capacity: z.number().int().min(1),
  remaining: z.number().int().min(0),
  priceModifier: z.number().default(1.0),
  isGuaranteed: z.boolean().default(false),
});
export type TourDeparture = z.infer<typeof TourDepartureSchema>;

export const TourModelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  titleFa: z.string().min(1),
  slug: z.string().min(1),
  city: z.string().min(1),
  countryCode: z.string().length(2),
  category: z.string().min(1),
  description: z.string().min(1),
  durationDays: z.number().int().min(1),
  durationNights: z.number().int().min(0),
  basePrice: z.string().regex(/^\d+(\.\d+)?$/, 'Base price must be decimal string'),
  currency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  depositAllowed: z.boolean().default(true),
  depositPercent: z.number().min(0).max(100).default(30),
  ratingAvg: z.number().min(0).max(5).default(5),
  ratingCount: z.number().int().min(0).default(0),
  featuredImage: z.string().optional(),
  gallery: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  executionModels: z.array(TourExecutionModelSchema).default(['group', 'private']),
  hotelTiers: z.array(TourHotelTierSchema).default(['ECO', 'STD', 'LUX']),
  itinerary: z.array(TourItineraryDaySchema).default([]),
  includedServices: z.array(z.string()).default([]),
  excludedServices: z.array(z.string()).default([]),
  departures: z.array(TourDepartureSchema).default([]),
});
export type TourModel = z.infer<typeof TourModelSchema>;

export const TourBookingDraftSchema = z.object({
  tourId: z.string().min(1),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  travelers: z.number().int().min(1).max(30),
  executionModel: TourExecutionModelSchema.default('group'),
  hotelTier: TourHotelTierSchema.default('STD'),
  specialRequests: z.string().optional(),
});
export type TourBookingDraft = z.infer<typeof TourBookingDraftSchema>;

/** Tier pricing multiplier */
export const HOTEL_TIER_MULTIPLIERS: Record<TourHotelTier, number> = {
  ECO: 0.85,
  STD: 1.0,
  LUX: 1.45,
};

/** Private execution surcharge multiplier */
export const PRIVATE_EXECUTION_MULTIPLIER = 1.35;

/** Calculates authoritative total price for a tour booking */
export function calculateTourTotal(
  tour: TourModel,
  draft: TourBookingDraft,
): Money {
  const base = new Decimal(tour.basePrice);
  const tierMult = new Decimal(HOTEL_TIER_MULTIPLIERS[draft.hotelTier] ?? 1.0);
  const execMult = draft.executionModel === 'private' ? new Decimal(PRIVATE_EXECUTION_MULTIPLIER) : new Decimal(1.0);

  const dep = tour.departures.find((d) => d.date === draft.departureDate);
  const depMult = dep ? new Decimal(dep.priceModifier) : new Decimal(1.0);

  const unitPrice = base.times(tierMult).times(execMult).times(depMult);
  // Currency-aware rounding (AGENTS.md §5.3): 0 dp for IRR, 2 dp for USD/EUR/AED/CNY/RUB.
  const dp = CURRENCY_PRECISION[tour.currency as CurrencyCode] ?? 2;
  const total = unitPrice.times(draft.travelers).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);

  return money(total, tour.currency as CurrencyCode);
}

/** Calculates required deposit amount */
export function calculateTourDeposit(total: Money, depositPercent: number): Money {
  if (depositPercent <= 0 || depositPercent >= 100) {
    return total;
  }
  const factor = new Decimal(depositPercent).dividedBy(100);
  // Currency-aware rounding so fractional cents in non-IRR currencies survive.
  const dp = CURRENCY_PRECISION[total.currency] ?? 2;
  const deposit = total.amount.times(factor).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
  return money(deposit, total.currency);
}

/** Validates that the requested departure has enough available capacity */
export function isTourDepartureAvailable(departure: TourDeparture, travelers: number): boolean {
  return departure.remaining >= travelers;
}

/** Formats duration string (e.g. "4 Days / 3 Nights" or "4 روز / 3 شب") */
export function formatTourDuration(days: number, nights: number, isFa = false): string {
  if (isFa) {
    return `${days} روز / ${nights} شب`;
  }
  return `${days} Day${days === 1 ? '' : 's'} / ${nights} Night${nights === 1 ? '' : 's'}`;
}
