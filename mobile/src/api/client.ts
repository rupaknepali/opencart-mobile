import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { config, configProblem } from '../config';
import type { ApiEnvelope, FieldErrors } from './types';

const TOKEN_KEY = 'oc_session_token';
/** Abort requests that take longer than this, so a dead network never leaves a spinner forever. */
const REQUEST_TIMEOUT_MS = 20000;
const CURRENCY_KEY = 'oc_currency';

export class ApiError extends Error {
  status: number;
  errors: FieldErrors;

  constructor(message: string, status: number, errors: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let sessionToken: string | null = null;
let currency: string | null = null;
let loaded = false;

// SecureStore is not available on web; fall back to localStorage there.
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string | null): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (value === null) globalThis.localStorage?.removeItem(key);
        else globalThis.localStorage?.setItem(key, value);
      } catch {
        // storage blocked: keep the in-memory value only
      }
      return;
    }
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  },
};

async function ensureLoaded() {
  if (loaded) return;
  sessionToken = await storage.get(TOKEN_KEY);
  currency = await storage.get(CURRENCY_KEY);
  loaded = true;
}

export async function setSessionToken(token: string | null) {
  sessionToken = token;
  await storage.set(TOKEN_KEY, token);
}

export async function setCurrency(code: string) {
  currency = code;
  await storage.set(CURRENCY_KEY, code);
}

export function getSessionToken() {
  return sessionToken;
}

export function buildUrl(route: string, query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  params.set('route', `extension/mobile_api/api/${route}`);
  params.set('language', config.language);
  if (currency) params.set('currency', currency);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return `${config.baseUrl}index.php?${params.toString()}`;
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  query?: Record<string, unknown>;
  body?: unknown;
};

/**
 * Calls an endpoint of the Mobile App API extension and unwraps the envelope.
 * Throws ApiError with field errors on failure.
 */
export async function request<T>(route: string, options: RequestOptions = {}): Promise<T> {
  const problem = configProblem();
  if (problem) throw new ApiError(problem, 0);

  await ensureLoaded();

  const method = options.method ?? (options.body !== undefined ? 'POST' : 'GET');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Api-Key': config.apiKey,
  };
  if (sessionToken) headers['X-Session-Token'] = sessionToken;
  if (method === 'POST') headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(route, options.query), {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted ? 'The store is taking too long to respond. Please try again.' : 'Cannot reach the store. Check your internet connection.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  // The server echoes the session it used; keep it so the cart and login persist.
  const echoed = response.headers.get('X-Session-Token');
  if (echoed && echoed !== sessionToken) {
    await setSessionToken(echoed);
  }

  let json: ApiEnvelope<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(`Unexpected response from the store (HTTP ${response.status}). Is the Mobile App API extension installed and enabled?`, response.status);
  }

  if (!json.success) {
    const errors = json.errors && !Array.isArray(json.errors) ? json.errors : {};
    throw new ApiError(json.error || 'Something went wrong.', response.status, errors);
  }

  return json.data;
}
