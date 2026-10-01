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

  it('normalizes legacy prices without float math and without the 10k misclassification', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: [
            // Untagged USD-scale: high-value fare must stay USD (old bug: 12000 / 600000 = 0.02)
            { id: 'fl-usd-12k', flightNo: 'IR12', price: 12000 },
            // Untagged IRR-scale integer: converted at the documented fallback rate
            { id: 'fl-irr-48m', flightNo: 'IR48', price: 48000000 },
            // Explicit IRR tag: server is authoritative, kept in IRR without conversion
            { id: 'fl-tagged-irr', flightNo: 'IR49', price: 48000000, currency: 'IRR' },
            // Fractional untagged price is USD by payload convention
            { id: 'fr-usd-frac', flightNo: 'IR50', price: '1,250.50' },
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

    expect(res.offers).toHaveLength(4);
    const byId = new Map(res.offers.map((o) => [o.id, o]));
    expect(byId.get('fl-usd-12k')?.priceAmount).toBe('12000.00');
    expect(byId.get('fl-usd-12k')?.priceCurrency).toBe('USD');
    // 48,000,000 / 600,000 = 80.00 USD — Decimal, ROUND_HALF_UP at 2 dp
    expect(byId.get('fl-irr-48m')?.priceAmount).toBe('80.00');
    expect(byId.get('fl-irr-48m')?.priceCurrency).toBe('USD');
    expect(byId.get('fl-tagged-irr')?.priceAmount).toBe('48000000');
    expect(byId.get('fl-tagged-irr')?.priceCurrency).toBe('IRR');
    expect(byId.get('fr-usd-frac')?.priceAmount).toBe('1250.50');
    expect(byId.get('fr-usd-frac')?.priceCurrency).toBe('USD');
  });

  it('skips legacy records without a usable positive price instead of fabricating one', async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: [
            { id: 'fl-priced', flightNo: 'IR60', price: 45 },
            { id: 'fl-no-price', flightNo: 'IR61' },
            { id: 'fl-zero-price', flightNo: 'IR62', price: 0 },
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
    expect(res.offers[0]?.id).toBe('fl-priced');
    expect(res.offers[0]?.priceAmount).toBe('45.00');
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

  it('strictly throws on network failure instead of fabricating fake flights', async () => {
    const mockAxios = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as AxiosInstance;

    const service = createFlightService(mockAxios);
    await expect(
      service.searchFlights({
        origin: 'IKA',
        destination: 'SYZ',
        departDate: '2026-11-01',
        adults: 1,
        cabinClass: 'ECONOMY',
      }),
    ).rejects.toThrow(/Flight search error/);
  });
});
