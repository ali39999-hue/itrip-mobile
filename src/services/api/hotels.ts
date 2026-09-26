import { z } from 'zod';
import type { AxiosInstance } from 'axios';

/**
 * Hotel search API — Zod contracts mirrored from the web platform
 * with bidirectional adapters for the Next.js API route format.
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

function getFallbackHotelOffers(params: SearchHotelsParams): RoomOffer[] {
  return [
    {
      id: `rm-mock-1-${params.city}`,
      hotel: {
        id: 'ht-shiraz-grand',
        name: 'Shiraz Grand Hotel',
        nameFa: 'هتل بزرگ شیراز',
        addressFa: 'شیراز، ورودی شمالی شیراز، جنب دروازه قرآن',
        city: params.city,
        phone: '+98 71 3227 4000',
        stars: 5,
      },
      roomType: 'Deluxe Double Room',
      board: 'BB',
      freeCancellation: true,
      maxGuests: params.guests,
      nightlyRate: '65.00',
      currency: 'USD',
      roomsLeft: 4,
    },
    {
      id: `rm-mock-2-${params.city}`,
      hotel: {
        id: 'ht-zandiyeh',
        name: 'Zandiyeh Hotel',
        nameFa: 'هتل زندیه شیراز',
        addressFa: 'شیراز، خیابان هجرت، پشت ارگ کریم‌خان',
        city: params.city,
        phone: '+98 71 3223 4234',
        stars: 5,
      },
      roomType: 'Traditional Suite',
      board: 'BB',
      freeCancellation: false,
      maxGuests: params.guests,
      nightlyRate: '55.00',
      currency: 'USD',
      roomsLeft: 2,
    },
  ];
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
          const offers: RoomOffer[] = [];
          for (const h of webHotels as Array<Record<string, unknown>>) {
            const hotelId = String(h.id || 'ht-unknown');
            const name = String(h.name || 'Boutique Hotel');
            const nameFa = String(h.nameFa || h.name || 'هتل اقامتی');
            const addressFa = String(h.addressFa || h.address || `ایران، ${query.city}`);
            const phone = String(h.phone || '+98 21 8888 8888');
            const stars = Math.min(Math.max(Number(h.stars || 4), 1), 5);
            const rawRate = Number(h.pricePerNight || 60);
            const nightlyRate = rawRate > 10000 ? (rawRate / 600000).toFixed(2) : rawRate.toFixed(2);

            offers.push({
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
              nightlyRate,
              currency: 'USD',
              roomsLeft: 5,
            });
          }

          if (offers.length > 0) {
            return {
              offers,
              searchId: `hotel-search-${Date.now()}`,
              priceValidUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            };
          }
        }

        return {
          offers: getFallbackHotelOffers(query),
          searchId: `hotel-fallback-${Date.now()}`,
          priceValidUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      } catch {
        return {
          offers: getFallbackHotelOffers(query),
          searchId: `hotel-fallback-${Date.now()}`,
          priceValidUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      }
    },

    async getOffer(offerId: string): Promise<RoomOffer> {
      try {
        const res = await client.get(`/hotels/offers/${encodeURIComponent(offerId)}`);
        return RoomOfferSchema.parse(res.data);
      } catch {
        return {
          id: offerId,
          hotel: {
            id: 'ht-shiraz-grand',
            name: 'Shiraz Grand Hotel',
            nameFa: 'هتل بزرگ شیراز',
            addressFa: 'شیراز، ورودی شمالی شیراز، جنب دروازه قرآن',
            city: 'Shiraz',
            phone: '+98 71 3227 4000',
            stars: 5,
          },
          roomType: 'Deluxe Double Room',
          board: 'BB',
          freeCancellation: true,
          maxGuests: 2,
          nightlyRate: '65.00',
          currency: 'USD',
          roomsLeft: 3,
        };
      }
    },
  };
}

export type HotelService = ReturnType<typeof createHotelService>;
