import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { FlightOffer, FlightSegment, SearchFlightsParams } from '@/domains/booking/offerTypes';
import { normalizeLegacyPrice, readTaggedCurrency } from '@/domains/currency/rates';

/**
 * Flight search API — Zod contracts mirrored from the web platform
 * with bidirectional adapters for the Next.js API route format.
 *
 * Strict Production Invariants:
 * - Real API integration with the authoritative flight catalog.
 * - No fabricated fallback flights on network failure.
 * - No fabricated prices: legacy records without a usable positive price are
 *   skipped, never defaulted (the former `|| 40` is gone).
 * - Zero float arithmetic on money (AGENTS.md §5.3): legacy price
 *   normalization runs through Decimal (see @/domains/currency/rates) with
 *   ROUND_HALF_UP at CURRENCY_PRECISION of the target currency, and amounts
 *   cross the wire as decimal strings.
 *
 * Canonical pure types live in @/domains/booking/offerTypes and are
 * re-exported here so existing consumers stay untouched.
 */

export const AirportSchema = z.object({
  code: z.string().length(3), // IATA
  city: z.string().min(1),
  cityFa: z.string().min(1), // Persian name for Driver Card / local UI
  country: z.string().length(2),
});
export type Airport = z.infer<typeof AirportSchema>;

export const FlightSegmentSchema: z.ZodType<FlightSegment> = z.object({
  airlineCode: z.string().min(2).max(3),
  flightNumber: z.string().regex(/^[A-Z0-9]{2,3}\d{1,4}$/),
  departureTime: z.string(),
  arrivalTime: z.string(),
  durationMinutes: z.number().int().positive(),
  cabinClass: z.enum(['ECONOMY', 'BUSINESS', 'FIRST']),
  aircraft: z.string().optional(),
});

export const FlightOfferSchema: z.ZodType<FlightOffer> = z.object({
  id: z.string().min(1),
  segments: z.array(FlightSegmentSchema).min(1),
  /** Per-adult base price in the offer currency (decimal string, never float). */
  priceAmount: z.string().regex(/^\d+(\.\d+)?$/),
  priceCurrency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  seatsLeft: z.number().int().min(0).max(9).optional(),
  refundable: z.boolean(),
  baggageKg: z.number().int().min(0),
});

export const SearchFlightsParamsSchema: z.ZodType<SearchFlightsParams, z.ZodTypeDef, unknown> =
  z.object({
    origin: z.string().length(3),
    destination: z.string().length(3),
    /** ISO date YYYY-MM-DD */
    departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    adults: z.number().int().min(1).max(9).default(1),
    cabinClass: z.enum(['ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
  });

export type { FlightSegment, FlightOffer, SearchFlightsParams } from '@/domains/booking/offerTypes';

const SearchFlightsResponseSchema = z.object({
  offers: z.array(FlightOfferSchema),
  searchId: z.string().min(1),
  /** ISO datetime after which held prices may change. */
  priceValidUntil: z.string(),
});

function parseDurationMinutes(duration?: string): number {
  if (!duration) return 90;
  const match = duration.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/i);
  if (!match) return 90;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  const total = hours * 60 + mins;
  return total > 0 ? total : 90;
}

/**
 * Adapts one legacy web-platform flight record into the uniform mobile offer.
 * Price rule (see @/domains/currency/rates.normalizeLegacyPrice):
 * - Explicit `currency` tag from the payload is used verbatim (server is
 *   authoritative) — including IRR, which is kept in IRR.
 * - Untagged IRR-scale prices convert to USD at the documented fallback rate;
 *   untagged smaller prices are already USD per the web payload convention.
 * Returns null when the record carries no usable positive price — such
 * offers are skipped instead of being priced with a fabricated default.
 */
function buildOfferFromWebFlight(
  f: Record<string, unknown>,
  idx: number,
  departDate: string,
): FlightOffer | null {
  const priced = normalizeLegacyPrice(f.price, readTaggedCurrency(f.currency));
  if (!priced) return null;

  const airlineCode = String(f.airline || f.airlineEn || 'IR').slice(0, 3).toUpperCase();
  const flightNumber = String(f.flightNo || `IR${100 + idx}`);
  const dep = String(f.departureTime || `${departDate}T10:00:00Z`);
  const arr = String(f.arrivalTime || `${departDate}T11:30:00Z`);

  return {
    id: String(f.id || `offer-${idx}`),
    segments: [
      {
        airlineCode,
        flightNumber: /^[A-Z0-9]{2,3}\d{1,4}$/.test(flightNumber) ? flightNumber : `IR${100 + idx}`,
        departureTime: dep,
        arrivalTime: arr,
        durationMinutes: parseDurationMinutes(f.duration as string | undefined),
        cabinClass: (f.cabinClass === 'business' ? 'BUSINESS' : 'ECONOMY') as 'ECONOMY' | 'BUSINESS',
        aircraft: f.aircraft as string | undefined,
      },
    ],
    priceAmount: priced.amount,
    priceCurrency: priced.currency,
    seatsLeft: typeof f.seatsLeft === 'number' ? Math.min(f.seatsLeft, 9) : 5,
    refundable: f.refundable !== false,
    baggageKg: parseInt(String(f.baggage || '20'), 10) || 20,
  };
}

export function createFlightService(client: AxiosInstance) {
  return {
    async searchFlights(params: SearchFlightsParams): Promise<{
      offers: FlightOffer[];
      searchId: string;
      priceValidUntil: string;
    }> {
      const query = SearchFlightsParamsSchema.parse(params);
      try {
        // Query both mobile standard params and web backend aliases
        const res = await client.get('/flights/search', {
          params: {
            ...query,
            from: query.origin,
            to: query.destination,
            depart: query.departDate,
          },
        });

        // 1. Direct mobile format
        if (res.data?.offers && Array.isArray(res.data.offers)) {
          return SearchFlightsResponseSchema.parse(res.data);
        }

        // 2. Next.js platform web route format: { success: true, data: Flight[] }
        if (res.data?.success && Array.isArray(res.data.data)) {
          const rawFlights = res.data.data as Array<Record<string, unknown>>;
          const offers: FlightOffer[] = rawFlights
            .map((f, idx) => buildOfferFromWebFlight(f, idx, query.departDate))
            .filter((offer): offer is FlightOffer => offer !== null);

          return {
            offers,
            searchId: `search-${Date.now()}`,
            priceValidUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          };
        }

        return {
          offers: [],
          searchId: `search-empty-${Date.now()}`,
          priceValidUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: unknown }; message?: string };
        const msg = (axiosErr.response?.data as { error?: string })?.error || axiosErr.message || 'Flight search failed';
        throw new Error(`Flight search error: ${msg}. Please check your connection or retry.`);
      }
    },

    async getOffer(offerId: string): Promise<FlightOffer> {
      const res = await client.get(`/flights/offers/${encodeURIComponent(offerId)}`);
      return FlightOfferSchema.parse(res.data);
    },
  };
}

export type FlightService = ReturnType<typeof createFlightService>;
