/**
 * Pure offer contract types for the booking domain — src/domains/booking/offerTypes.ts
 *
 * Zero runtime dependencies: these are the canonical TypeScript shapes shared
 * across layers (Zustand stores, voucher builder, pricing engine, screens).
 * The Zod schemas in src/services/api/flights.ts mirror them 1:1 and are
 * compile-time annotated with `z.ZodType<T>` so the wire contract can never
 * drift from these types.
 *
 * Financial invariant (AGENTS.md §5.3): `priceAmount` is a decimal string,
 * never a float, in the currency named by `priceCurrency`.
 */

export interface FlightSegment {
  /** 2-3 letter IATA airline code (e.g. 'W5', 'IR'). */
  airlineCode: string;
  /** Full flight number, LTR-isolated on display (e.g. 'W5-1082'). */
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  cabinClass: 'ECONOMY' | 'BUSINESS' | 'FIRST';
  aircraft?: string;
}

export interface FlightOffer {
  id: string;
  segments: FlightSegment[];
  /** Per-adult base price as a decimal string (never float). */
  priceAmount: string;
  priceCurrency: 'IRR' | 'USD' | 'EUR' | 'AED' | 'CNY' | 'RUB';
  seatsLeft?: number;
  refundable: boolean;
  baggageKg: number;
}

export interface SearchFlightsParams {
  /** 3-letter IATA origin code. */
  origin: string;
  /** 3-letter IATA destination code. */
  destination: string;
  /** ISO date YYYY-MM-DD */
  departDate: string;
  /** ISO date YYYY-MM-DD */
  returnDate?: string;
  adults: number;
  cabinClass: 'ECONOMY' | 'BUSINESS' | 'FIRST';
}
