# Security

## Reporting a vulnerability

Please report security problems privately to the project maintainers rather than in a public issue. Include the affected component (mobile app or `mobile_api` extension), the version, and steps to reproduce.

## Production checklist

Server and store:

- [ ] The store is served over **HTTPS** with a valid certificate. Release builds of the app refuse plain `http://`.
- [ ] A **new API key** for production in the Mobile App API module (not the development key), matching `EXPO_PUBLIC_API_KEY` in the production build.
- [ ] **CORS Origin** is empty in the module settings (only needed for browser testing).
- [ ] Two-factor authentication is off for customers (app logins are refused while it is on), or app logins are accepted as unavailable.
- [ ] A sensible **session lifetime** (System → Settings → Server). The session token is a bearer credential.
- [ ] Web server **access logs are protected**: the online-payment page URL contains the session token.
- [ ] Optional: rate limiting at the web server or CDN for `account.login`, `account.register` and `product.review` routes.
- [ ] PHP `display_errors` is off, so errors never leak into JSON responses.

App:

- [ ] `APP_BUNDLE_ID` set to your own reverse-domain ID (the production build refuses `com.example.*`).
- [ ] Icon and splash replaced with your branding.
- [ ] Optional: a crash reporter (e.g. Sentry) hooked into `ErrorBoundary.componentDidCatch` in `mobile/App.tsx`.

Repository:

- [ ] `.env`, `mobile/.env`, `store/` and signing credentials are never committed (see `.gitignore`).
- [ ] The local Docker store is for development only. Its default bind address is `127.0.0.1`; `STORE_BIND_ADDRESS=0.0.0.0` exposes it, including the admin, to your network.

## Design notes and known limits

The full list of security measures and their limits (why the API key is not a secret, the payment-page token, missing captcha, session handling) is in [docs/DEVELOPER.md §14](docs/DEVELOPER.md#14-security-measures).
