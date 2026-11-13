# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

The mobile app (`mobile/app.config.ts`) and the extension (`opencart-extension/mobile_api/install.json`) are versioned separately. Note which extension version each app release needs.

## [1.0.0] - Unreleased

### Mobile app

- Expo SDK 58 / React Native 0.88 app for iOS and Android: home, catalog, search, product with every option type, reviews, cart with coupons, wishlist, guest and logged-in checkout, offline and WebView payments, account, address book, order history and reorder, currency switcher, information pages.
- Store colours from the admin (primary, secondary, tertiary, font, button, button text) with automatic contrast.
- Store URL, API key and language from `EXPO_PUBLIC_*` environment variables, with a start-screen message when the configuration is missing or invalid. Release builds require an HTTPS store.
- 20-second request timeout and a crash screen (error boundary) instead of a blank app.
- `app.config.ts` with development / preview / production variants, `eas.json` build profiles, app icon, adaptive icon and splash screen.
- ESLint, Prettier and Jest unit tests (`npm run check`).

### Mobile App API extension

- JSON API for OpenCart 4.1.0.4: catalog, products, reviews, cart, wishlist, accounts, addresses, orders, localisation and checkout with every installed shipping, payment and total extension.
- Session restore from the `X-Session-Token` header, API key check, admin settings page with banner, featured products, image size and app colours.

### Project

- Local Docker dev store with one-command setup (`make store`), `Makefile`, GitHub Actions CI (app checks, PHP 8.0/8.3 lint, extension package artifact).
- Documentation published on webocreation.com: a project overview and a 5-part developer guide.
