import { z } from 'zod';
import type { AxiosInstance } from 'axios';

/**
 * Hotel search API — Zod contracts mirrored from the web platform
 * (same wire format the Next.js backend serves for hotel search).
 */

export const HotelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Persian name for the Driver Card shown to taxi drivers. */
  nameFa: z.string().min(1),
  /** Full Persian address for the Driver Card. */
  addressFa: z.string().min(1),
  city: z.string().min(1),
  phone: z.string().min(5),
  stars: z.number().int().min(1).max(5),
  imageUrl: z.string().optional(),
});
export type Hotel = z.infer<typeof HotelSchema>;

export const RoomOfferSchema = z.object({
  id: z.string().min(1),
  hotel: HotelSchema,
  roomType: z.string().min(1),
  board: z.enum(['RO', 'BB', 'HB', 'FB']), // room-only / breakfast / half / full board
  freeCancellation: z.boolean(),
  maxGuests: z.number().int().min(1).max(6),
  /** Per-night rate as a decimal string (never float over the wire). */
  nightlyRate: z.string().regex(/^\d+(\.\d+)?$/),
  currency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  roomsLeft: z.number().int().min(0).optional(),
});
export type RoomOffer = z.infer<typeof RoomOfferSchema>;

export const SearchHotelsParamsSchema = z.object({
  city: z.string().min(2),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(10).default(2),
  rooms: z.number().int().min(1).max(5).default(1),
});
export type SearchHotelsParams = z.infer<typeof SearchHotelsParamsSchema>;

const SearchHotelsResponseSchema = z.object({
  offers: z.array(RoomOfferSchema),
  searchId: z.string().min(1),
  priceValidUntil: z.string(),
});

export function createHotelService(client: AxiosInstance) {
  return {
    async searchHotels(params: SearchHotelsParams): Promise<{
      offers: RoomOffer[];
      searchId: string;
      priceValidUntil: string;
    }> {
      const query = SearchHotelsParamsSchema.parse(params);
      const res = await client.get('/hotels/search', { params: query });
      return SearchHotelsResponseSchema.parse(res.data);
    },

    async getOffer(offerId: string): Promise<RoomOffer> {
      const res = await client.get(`/hotels/offers/${encodeURIComponent(offerId)}`);
      return RoomOfferSchema.parse(res.data);
    },
  };
}

export type HotelService = ReturnType<typeof createHotelService>;
