import { createApiClient } from './client';
import { createAuthService } from './auth';
import { createFlightService } from './flights';
import { createHotelService } from './hotels';
import { createDeviceTokenService } from '@/services/notifications/deviceToken';

/**
 * Central API configuration.
 * TODO: point to production host + enable SSL pinning via native module.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const api = createApiClient({ baseURL: API_BASE_URL });
export const authService = createAuthService(api);
export const flightService = createFlightService(api);
export const hotelService = createHotelService(api);
export const deviceTokenService = createDeviceTokenService(api);
export { apiConfig } from './config';
export * from './flights';
export * from './hotels';