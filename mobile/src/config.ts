/**
 * Store connection settings, read from environment variables at build time.
 *
 * Set them in mobile/.env (copy mobile/.env.example) for local development, and as
 * EAS environment variables / eas.json "env" for store builds:
 *
 *   EXPO_PUBLIC_STORE_URL  your OpenCart 4.1.0.4 storefront URL, e.g. https://shop.example.com/
 *                          (Android emulator → http://10.0.2.2:8090/ reaches a server on your computer)
 *   EXPO_PUBLIC_API_KEY    Extensions → Extensions → Modules → Mobile App API → API Key
 *   EXPO_PUBLIC_LANGUAGE   optional, an installed store language code (default en-gb)
 *
 * EXPO_PUBLIC_* values are compiled into the app bundle, so they are NOT secret.
 * The API key identifies the app; it does not protect anything on its own
 * (see §14.2 of the developer guide:
 * https://webocreation.com/opencart-mobile-app-developer-guide-part-5/#14-security-measures).
 *
 * Expo only inlines these when they are referenced literally as
 * process.env.EXPO_PUBLIC_NAME, so don't read them dynamically.
 */
const storeUrl = (process.env.EXPO_PUBLIC_STORE_URL ?? '').trim();
const apiKey = (process.env.EXPO_PUBLIC_API_KEY ?? '').trim();
const language = (process.env.EXPO_PUBLIC_LANGUAGE ?? '').trim() || 'en-gb';

export const config = {
  /** Storefront URL, always with a trailing slash. */
  baseUrl: storeUrl && !storeUrl.endsWith('/') ? `${storeUrl}/` : storeUrl,
  apiKey,
  language,
  pageSize: 20,
};

/**
 * Returns a human-readable problem with the configuration, or null when it is usable.
 * The API client refuses to send requests while there is a problem, and the boot
 * screen shows this message.
 */
export function configProblem(isDev: boolean = __DEV__): string | null {
  if (!config.baseUrl) {
    return 'The store address is not set. Add EXPO_PUBLIC_STORE_URL to mobile/.env (or the EAS build environment) and restart Expo.';
  }
  if (!/^https?:\/\/[^/\s]+/i.test(config.baseUrl)) {
    return `The store address "${config.baseUrl}" is not a valid http(s) URL.`;
  }
  if (!isDev && !config.baseUrl.toLowerCase().startsWith('https://')) {
    return 'Release builds must use an https:// store address. Customer logins and payments must not travel over plain HTTP.';
  }
  if (!/^[a-zA-Z0-9]{20,64}$/.test(config.apiKey)) {
    return 'The API key is missing or invalid. Set EXPO_PUBLIC_API_KEY to the key shown on the Mobile App API module page.';
  }
  return null;
}
