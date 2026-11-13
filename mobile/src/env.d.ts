/**
 * Build-time environment variables inlined by Expo (see src/config.ts).
 * Declared here instead of pulling in @types/node for a React Native app.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_STORE_URL?: string;
    EXPO_PUBLIC_API_KEY?: string;
    EXPO_PUBLIC_LANGUAGE?: string;
    NODE_ENV?: string;
    // Build-time only, read by app.config.ts (Node), never by app code:
    APP_VARIANT?: string;
    APP_NAME?: string;
    APP_BUNDLE_ID?: string;
    EAS_PROJECT_ID?: string;
  };
};
