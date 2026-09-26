import { createApiClient } from './client';
import { createAuthService } from './auth';
import { createFlightService } from './flights';
import { createHotelService } from './hotels';
import { createBookingService } from './booking';
import { createWalletService } from './wallet';

/**
 * Central API configuration and service instances.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const api = createApiClient({ baseURL: API_BASE_URL });
export const authService = createAuthService(api);
export const flightService = createFlightService(api);
export const hotelService = createHotelService(api);
export const bookingService = createBookingService(api);
export const walletService = createWalletService(api);

export { apiConfig } from './config';
export * from './flights';
export * from './hotels';
export * from './booking';
export * from './wallet';