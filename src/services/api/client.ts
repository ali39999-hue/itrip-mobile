import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens, type StoredTokens } from '@/services/secure/tokens';
import { apiConfig } from './config';

/**
 * HTTP client for the iTrip platform API.
 *
 * Security Invariants (Phase 8 & Phase 9):
 * - Access token attached to every authenticated request automatically.
 * - Single-flight refresh on 401; concurrent requests queue behind it.
 * - Telemetry & audit headers attached (`x-correlation-id`, `x-client-version`, `x-client-platform`).
 * - Strict secret redaction: tokens, OTPs, and passwords never touch logs.
 * - SSL pinning validation hook for production environments.
 */

export interface ApiConfig {
  baseURL: string;
  pinningEnabled?: boolean;
}

let refreshing: Promise<StoredTokens | null> | null = null;

function generateCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Redacts sensitive headers and payloads before logging */
export function sanitizeRequestDetails(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const headers = { ...config.headers };
  if (headers.Authorization) {
    headers.Authorization = 'Bearer [REDACTED]';
  }
  return {
    url: config.url,
    method: config.method,
    headers,
  };
}

export function createApiClient(config: ApiConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: 20_000,
  });

  client.interceptors.request.use(async (req: InternalAxiosRequestConfig) => {
    // 1. Attach access token if present
    const token = await getAccessToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Attach security and correlation metadata headers
    req.headers['x-correlation-id'] = generateCorrelationId();
    req.headers['x-client-platform'] = apiConfig.platform;
    req.headers['x-client-version'] = apiConfig.appVersion;

    // 3. SSL Pinning check in production environments
    if (apiConfig.pinningEnforced) {
      const targetHost = req.baseURL || config.baseURL;
      const matchedDomain = apiConfig.pinnedDomains.find((p) => targetHost.includes(p.domain));
      if (matchedDomain && matchedDomain.pins.length === 0) {
        throw new Error(`SSL Pinning security violation: unpinned domain ${matchedDomain.domain}`);
      }
    }

    return req;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

      // 401 Unauthorized handling: attempt single-flight token refresh
      if (error.response?.status === 401 && original && !original._retried) {
        original._retried = true;
        const tokens = await refreshOnce(config);
        if (tokens) {
          original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return client(original);
        }
        // Refresh failed: session revoked on server; clear local credentials
        await clearTokens();
      }

      return Promise.reject(error);
    },
  );

  return client;
}

/** Single-flight refresh: concurrent 401s share one refresh call. */
async function refreshOnce(config: ApiConfig): Promise<StoredTokens | null> {
  if (!refreshing) {
    refreshing = doRefresh(config).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(config: ApiConfig): Promise<StoredTokens | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<StoredTokens>(
      `${config.baseURL}/auth/refresh`,
      { refreshToken },
      {
        timeout: 15_000,
        headers: {
          'x-correlation-id': generateCorrelationId(),
          'x-client-platform': apiConfig.platform,
          'x-client-version': apiConfig.appVersion,
        },
      },
    );
    const tokens = res.data;
    if (!tokens?.accessToken) return null;
    await saveTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}
