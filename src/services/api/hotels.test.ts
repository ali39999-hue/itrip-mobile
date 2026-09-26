import { describe, it, expect, vi } from 'vitest';
import { createHotelService } from './hotels';
import type { AxiosInstance } from 'axios';

describe('Hotel Service Web-to-Mobile Contract Convergence', () => {
  it('adapts Next.js platform { success: true, data: { hotels: Hotel[] } } to RoomOffer[] with Driver Card', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            hotels: [
              {
                id: 'ht-zandiyeh',
                name: 'Zandiyeh Hotel',
                nameFa: 'هتل زندیه شیراز',
                addressFa: 'شیراز، خیابان هجرت، پشت ارگ کریم‌خان',
                city: 'Shiraz',
                phone: '+987132234234',
                stars: 5,
                pricePerNight: 55.0,
                freeCancellation: true,
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        },
      }),
    } as unknown as AxiosInstance;

    const service = createHotelService(mockAxios);
    const res = await service.searchHotels({
      city: 'Shiraz',
      checkIn: '2026-11-12',
      checkOut: '2026-11-15',
      guests: 2,
      rooms: 1,
    });

    expect(res.offers).toHaveLength(1);
    const offer = res.offers[0]!;
    expect(offer.hotel.name).toBe('Zandiyeh Hotel');
    expect(offer.hotel.nameFa).toBe('هتل زندیه شیراز');
    expect(offer.hotel.addressFa).toBe('شیراز، خیابان هجرت، پشت ارگ کریم‌خان');
    expect(offer.hotel.phone).toBe('+987132234234');
    expect(offer.hotel.stars).toBe(5);
    expect(offer.nightlyRate).toBe('55.00');
    expect(offer.freeCancellation).toBe(true);
  });

  it('handles direct mobile format { offers: [...] }', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          offers: [
            {
              id: 'rm-1',
              hotel: {
                id: 'ht-1',
                name: 'Grand Hotel',
                nameFa: 'هتل گرند',
                addressFa: 'تهران، میدان ونک',
                city: 'Tehran',
                phone: '+982188888888',
                stars: 4,
              },
              roomType: 'Deluxe Room',
              board: 'BB',
              freeCancellation: true,
              maxGuests: 2,
              nightlyRate: '60.00',
              currency: 'USD',
            },
          ],
          searchId: 's-hotel-1',
          priceValidUntil: '2026-11-12T12:00:00Z',
        },
      }),
    } as unknown as AxiosInstance;

    const service = createHotelService(mockAxios);
    const res = await service.searchHotels({
      city: 'Tehran',
      checkIn: '2026-11-12',
      checkOut: '2026-11-15',
      guests: 2,
      rooms: 1,
    });

    expect(res.offers).toHaveLength(1);
    expect(res.offers[0]?.hotel.nameFa).toBe('هتل گرند');
  });

  it('falls back gracefully to offline mock catalog when network fails', async () => {
    const mockAxios = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as AxiosInstance;

    const service = createHotelService(mockAxios);
    const res = await service.searchHotels({
      city: 'Shiraz',
      checkIn: '2026-11-12',
      checkOut: '2026-11-15',
      guests: 2,
      rooms: 1,
    });

    expect(res.offers.length).toBeGreaterThan(0);
    expect(res.searchId).toMatch(/^hotel-fallback-/);
  });
});
