import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import { normalizeLegacyPrice, readTaggedCurrency } from '@/domains/currency/rates';

/**
 * Hotel search API — Zod contracts mirrored from the web platform
 * with bidirectional adapters for the Next.js API route format.
 *
 * Strict Production Invariants:
 * - Real API integration with the authoritative hotel catalog.
 * - No fabricated fallback hotels on network failure.
 * - No fabricated rates: legacy records without a usable positive
 *   pricePerNight are skipped, never defaulted (the former `|| 60` is gone).
 * - Zero float arithmetic on money (AGENTS.md §5.3): legacy rate
 *   normalization runs through Decimal (see @/domains/currency/rates) with
 *   ROUND_HALF_UP at CURRENCY_PRECISION of the target currency; nightlyRate
 *   stays a decimal string (never float over the wire).
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

/**
 * Adapts one legacy web-platform hotel record into a RoomOffer.
 * Price rule (see @/domains/currency/rates.normalizeLegacyPrice):
 * - Explicit `currency` tag from the payload is used verbatim (server is
 *   authoritative) — including IRR, which is kept in IRR.
 * - Untagged IRR-scale rates convert to USD at the documented fallback rate;
 *   untagged smaller rates are already USD per the web payload convention.
 * Returns null when the record carries no usable positive pricePerNight —
 * such hotels are skipped instead of being rated with a fabricated default.
 */
function buildRoomOfferFromWebHotel(h: Record<string, unknown>, query: SearchHotelsParams): RoomOffer | null {
  const priced = normalizeLegacyPrice(h.pricePerNight, readTaggedCurrency(h.currency));
  if (!priced) return null;

  const hotelId = String(h.id || 'ht-unknown');
  const name = String(h.name || 'Boutique Hotel');
  const nameFa = String(h.nameFa || h.name || 'هتل اقامتی');
  const addressFa = String(h.addressFa || h.address || `ایران، ${query.city}`);
  const phone = String(h.phone || '+98 21 8888 8888');
  const stars = Math.min(Math.max(Number(h.stars || 4), 1), 5);

  return {
    id: `room-${hotelId}-std`,
    hotel: {
      id: hotelId,
      name,
      nameFa,
      addressFa,
      city: String(h.city || query.city),
      phone,
      stars,
      imageUrl: (h.heroImage || h.imageUrl) as string | undefined,
    },
    roomType: 'Standard Room',
    board: 'BB',
    freeCancellation: Boolean(h.freeCancellation ?? true),
    maxGuests: query.guests,
    nightlyRate: priced.amount,
    currency: priced.currency,
    roomsLeft: 5,
  };
}

export function createHotelService(client: AxiosInstance) {
  return {
    async searchHotels(params: SearchHotelsParams): Promise<{
      offers: RoomOffer[];
      searchId: string;
      priceValidUntil: string;
    }> {
      const query = SearchHotelsParamsSchema.parse(params);
      try {
        const res = await client.get('/hotels/search', {
          params: {
            ...query,
            q: query.city,
            city: query.city,
          },
        });

        // 1. Direct mobile format
        if (res.data?.offers && Array.isArray(res.data.offers)) {
          return SearchHotelsResponseSchema.parse(res.data);
        }

        // 2. Next.js web route format: { success: true, data: { hotels: Hotel[] } }
        const webHotels = res.data?.data?.hotels || (Array.isArray(res.data?.data) ? res.data.data : null);
        if (Array.isArray(webHotels)) {
          const offers: RoomOffer[] = (webHotels as Array<Record<string, unknown>>)
            .map((h) => buildRoomOfferFromWebHotel(h, query))
            .filter((offer): offer is RoomOffer => offer !== null);

          return {
            offers,
            searchId: `hotel-search-${Date.now()}`,
            priceValidUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          };
        }

        return {
          offers: [],
          searchId: `hotel-empty-${Date.now()}`,
          priceValidUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: unknown }; message?: string };
        const msg = (axiosErr.response?.data as { error?: string })?.error || axiosErr.message || 'Hotel search failed';
        throw new Error(`Hotel search error: ${msg}. Please check your connection or retry.`);
      }
    },

    async getOffer(offerId: string): Promise<RoomOffer> {
      const res = await client.get(`/hotels/offers/${encodeURIComponent(offerId)}`);
      return RoomOfferSchema.parse(res.data);
    },
  };
}

export type HotelService = ReturnType<typeof createHotelService>;
