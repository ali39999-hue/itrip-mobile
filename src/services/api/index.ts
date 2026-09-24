import { createApiClient } from './client';
import { createAuthService } from './auth';

/**
 * Central API configuration.
 * TODO: point to production host + enable SSL pinning via native module.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const api = createApiClient({ baseURL: API_BASE_URL });
export const authService = createAuthService(api);
export { apiConfig } from './config';
