import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens, type StoredTokens } from '@/services/secure/tokens';

/**
 * HTTP client for the iTrip platform API.
 *
 * Security invariants:
 * - Access token attached to every request automatically.
 * - On 401, a single-flight refresh is attempted; concurrent requests queue.
 * - Tokens never touch logs.
 */

export interface ApiConfig {
  baseURL: string;
  /** SSL pinning callback injected from native module when available. */
  pinningEnabled?: boolean;
}

let refreshing: Promise<StoredTokens | null> | null = null;

export function createApiClient(config: ApiConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: 20_000,
  });

  client.interceptors.request.use(async (req: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
      if (error.response?.status === 401 && original && !original._retried) {
        original._retried = true;
        const tokens = await refreshOnce(config);
        if (tokens) {
          original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return client(original);
        }
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
      { timeout: 15_000 },
    );
    const tokens = res.data;
    if (!tokens?.accessToken) return null;
    await saveTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}
