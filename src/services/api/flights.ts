import { z } from 'zod';
import type { AxiosInstance } from 'axios';

/**
 * Flight search API — Zod contracts mirrored from the web platform
 * so both clients validate the same wire format.
 */

export const AirportSchema = z.object({
  code: z.string().length(3), // IATA
  city: z.string().min(1),
  cityFa: z.string().min(1), // Persian name for Driver Card / local UI
  country: z.string().length(2),
});
export type Airport = z.infer<typeof AirportSchema>;

export const FlightSegmentSchema = z.object({
  airlineCode: z.string().min(2).max(3),
  flightNumber: z.string().regex(/^[A-Z0-9]{2,3}\d{1,4}$/),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
  cabinClass: z.enum(['ECONOMY', 'BUSINESS', 'FIRST']),
  aircraft: z.string().optional(),
});
export type FlightSegment = z.infer<typeof FlightSegmentSchema>;

export const FlightOfferSchema = z.object({
  id: z.string().min(1),
  segments: z.array(FlightSegmentSchema).min(1),
  /** Per-adult base price in the offer currency. */
  priceAmount: z.string().regex(/^\d+(\.\d+)?$/),
  priceCurrency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  seatsLeft: z.number().int().min(0).max(9).optional(),
  refundable: z.boolean(),
  baggageKg: z.number().int().min(0),
});
export type FlightOffer = z.infer<typeof FlightOfferSchema>;

export const SearchFlightsParamsSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  /** ISO date YYYY-MM-DD */
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).max(9).default(1),
  cabinClass: z.enum(['ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
});
export type SearchFlightsParams = z.infer<typeof SearchFlightsParamsSchema>;

const SearchFlightsResponseSchema = z.object({
  offers: z.array(FlightOfferSchema),
  searchId: z.string().min(1),
  /** ISO datetime after which held prices may change. */
  priceValidUntil: z.string().datetime(),
});

export function createFlightService(client: AxiosInstance) {
  return {
    async searchFlights(params: SearchFlightsParams): Promise<{
      offers: FlightOffer[];
      searchId: string;
      priceValidUntil: string;
    }> {
      const query = SearchFlightsParamsSchema.parse(params);
      const res = await client.get('/flights/search', { params: query });
      return SearchFlightsResponseSchema.parse(res.data);
    },

    async getOffer(offerId: string): Promise<FlightOffer> {
      const res = await client.get(`/flights/offers/${encodeURIComponent(offerId)}`);
      return FlightOfferSchema.parse(res.data);
    },
  };
}

export type FlightService = ReturnType<typeof createFlightService>;
