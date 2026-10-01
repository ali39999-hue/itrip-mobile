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

  it('normalizes legacy nightly rates without float math and without the 10k misclassification', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            hotels: [
              // Untagged USD-scale high-value suite: must stay USD (old bug: 12000 / 600000 = 0.02)
              { id: 'ht-usd-12k', name: 'Penthouse', pricePerNight: 12000, city: 'Tehran' },
              // Untagged IRR-scale integer: converted at the documented fallback rate
              { id: 'ht-irr-48m', name: 'هتل سنتی', pricePerNight: 48000000, city: 'Yazd' },
              // Explicit EUR tag: server is authoritative, kept in EUR
              { id: 'ht-eur', name: 'Grand Europa', pricePerNight: '90.5', currency: 'EUR', city: 'Vienna' },
            ],
          },
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

    expect(res.offers).toHaveLength(3);
    const byHotelId = new Map(res.offers.map((o) => [o.hotel.id, o]));
    expect(byHotelId.get('ht-usd-12k')?.nightlyRate).toBe('12000.00');
    expect(byHotelId.get('ht-usd-12k')?.currency).toBe('USD');
    // 48,000,000 / 600,000 = 80.00 USD — Decimal, ROUND_HALF_UP at 2 dp
    expect(byHotelId.get('ht-irr-48m')?.nightlyRate).toBe('80.00');
    expect(byHotelId.get('ht-irr-48m')?.currency).toBe('USD');
    expect(byHotelId.get('ht-eur')?.nightlyRate).toBe('90.50');
    expect(byHotelId.get('ht-eur')?.currency).toBe('EUR');
  });

  it('skips legacy hotel records without a usable positive nightly rate instead of fabricating one', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            hotels: [
              { id: 'ht-priced', name: 'Priced Hotel', pricePerNight: 55, city: 'Shiraz' },
              { id: 'ht-no-rate', name: 'Mystery Hotel', city: 'Shiraz' },
              { id: 'ht-zero-rate', name: 'Free Hotel', pricePerNight: 0, city: 'Shiraz' },
            ],
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
    expect(res.offers[0]?.hotel.id).toBe('ht-priced');
    expect(res.offers[0]?.nightlyRate).toBe('55.00');
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

  it('strictly throws on network failure instead of fabricating fake hotels', async () => {
    const mockAxios = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as AxiosInstance;

    const service = createHotelService(mockAxios);
    await expect(
      service.searchHotels({
        city: 'Shiraz',
        checkIn: '2026-11-12',
        checkOut: '2026-11-15',
        guests: 2,
        rooms: 1,
      }),
    ).rejects.toThrow(/Hotel search error/);
  });
});
