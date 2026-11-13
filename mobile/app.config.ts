import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo app configuration. Replaces app.json so values can come from the environment.
 *
 * Build-time variables (set them in eas.json "env", as EAS environment variables, or in your shell):
 *   APP_VARIANT     development | preview | production   (default: development)
 *   APP_NAME        display name                          (default: OpenCart Store)
 *   APP_BUNDLE_ID   iOS bundle identifier and Android package. Must be your own reverse-domain id
 *                   (e.g. com.yourcompany.store) before the first store release — it can't change later.
 *   EAS_PROJECT_ID  set by `eas init` (enables EAS Build / Update)
 *
 * The store URL and API key are separate: EXPO_PUBLIC_* variables read in src/config.ts.
 */
const VARIANT = process.env.APP_VARIANT ?? 'development';
const IS_PRODUCTION = VARIANT === 'production';
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'com.example.ocstore';
const NAME = process.env.APP_NAME ?? 'OpenCart Store';

if (IS_PRODUCTION && BUNDLE_ID.startsWith('com.example.')) {
  throw new Error('APP_BUNDLE_ID is still com.example.* — set your own bundle identifier before building for production.');
}

// Non-production builds get their own id and name, so they install next to the store version.
const bundleId = IS_PRODUCTION ? BUNDLE_ID : `${BUNDLE_ID}.${VARIANT === 'preview' ? 'preview' : 'dev'}`;
const name = IS_PRODUCTION ? NAME : `${NAME} (${VARIANT === 'preview' ? 'Preview' : 'Dev'})`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name,
  slug: 'opencart-mobile-app',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  scheme: 'ocstore',
  icon: './assets/icon.png',
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      // Plain HTTP to local network addresses (the Docker dev store) — development and preview only.
      // Production builds keep Apple's default: HTTPS everywhere.
      ...(IS_PRODUCTION ? {} : { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } }),
    },
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1f6feb',
    },
  },
  plugins: [
    'expo-secure-store',
    'expo-font',
    'expo-asset',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#f6f7f9',
      },
    ],
  ],
  extra: {
    variant: VARIANT,
    ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
  },
});
