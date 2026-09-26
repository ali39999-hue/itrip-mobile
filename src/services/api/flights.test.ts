import { describe, it, expect, vi } from 'vitest';
import { createFlightService } from './flights';
import type { AxiosInstance } from 'axios';

describe('Flight Service Web-to-Mobile Contract Convergence', () => {
  it('adapts Next.js platform { success: true, data: Flight[] } to FlightOffer[]', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              id: 'fl-next-1',
              airline: 'W5',
              airlineEn: 'Mahan Air',
              flightNo: 'W51042',
              departureTime: '2026-11-01T08:30:00Z',
              arrivalTime: '2026-11-01T10:00:00Z',
              origin: 'IKA',
              destination: 'SYZ',
              duration: '1h 30m',
              price: 45.0,
              seatsLeft: 7,
              baggage: '20kg',
              cabinClass: 'economy',
              aircraft: 'Airbus A320',
              refundable: true,
            },
          ],
        },
      }),
    } as unknown as AxiosInstance;

    const service = createFlightService(mockAxios);
    const res = await service.searchFlights({
      origin: 'IKA',
      destination: 'SYZ',
      departDate: '2026-11-01',
      adults: 1,
      cabinClass: 'ECONOMY',
    });

    expect(res.offers).toHaveLength(1);
    const offer = res.offers[0]!;
    expect(offer.id).toBe('fl-next-1');
    expect(offer.priceAmount).toBe('45.00');
    expect(offer.priceCurrency).toBe('USD');
    expect(offer.segments[0]?.airlineCode).toBe('W5');
    expect(offer.segments[0]?.flightNumber).toBe('W51042');
    expect(offer.segments[0]?.durationMinutes).toBe(90);
    expect(offer.baggageKg).toBe(20);
  });

  it('handles direct mobile format { offers: [...] }', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          offers: [
            {
              id: 'fl-direct-1',
              segments: [
                {
                  airlineCode: 'IR',
                  flightNumber: 'IR452',
                  departureTime: '2026-11-01T14:00:00Z',
                  arrivalTime: '2026-11-01T15:30:00Z',
                  durationMinutes: 90,
                  cabinClass: 'ECONOMY',
                },
              ],
              priceAmount: '38.00',
              priceCurrency: 'USD',
              refundable: true,
              baggageKg: 20,
            },
          ],
          searchId: 's-123',
          priceValidUntil: '2026-11-01T12:00:00Z',
        },
      }),
    } as unknown as AxiosInstance;

    const service = createFlightService(mockAxios);
    const res = await service.searchFlights({
      origin: 'IKA',
      destination: 'SYZ',
      departDate: '2026-11-01',
      adults: 1,
      cabinClass: 'ECONOMY',
    });

    expect(res.offers).toHaveLength(1);
    expect(res.searchId).toBe('s-123');
  });

  it('falls back gracefully to offline mock catalog when network fails', async () => {
    const mockAxios = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as AxiosInstance;

    const service = createFlightService(mockAxios);
    const res = await service.searchFlights({
      origin: 'IKA',
      destination: 'SYZ',
      departDate: '2026-11-01',
      adults: 1,
      cabinClass: 'ECONOMY',
    });

    expect(res.offers.length).toBeGreaterThan(0);
    expect(res.searchId).toMatch(/^search-fallback-/);
  });
});
