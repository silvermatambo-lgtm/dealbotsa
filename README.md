# DealBotSA — Client Demo v0.4

**Live web app:** https://dealbotsa.vercel.app/

DealBotSA is a client-ready South African deal-monitoring PWA with actual Neon database storage for browser-guest state. The example discounts remain simulated, not live retailer pricing.

## Features implemented

- Dashboard with illustrative deal scores and price comparisons.
- Example listings for Takealot, Amazon ZA, VodaBucks and Checkers ZA, categorized as Electronics, Appliances and Toys.
- Search, filtering, sorting, personal watchlists and CSV export.
- Manual product link tracking, custom discount rules, category rules and per-product target-price rules.
- Simulation of price drops, match-based in-app notifications, optional browser notifications and notification inbox.
- Neon PostgreSQL backend with a securely isolated guest state, a history log and a live health-check endpoint.
- Typewriter title animations, moving charts and entrance transitions.
- Working mobile drawer navigation and fixed bottom navigation.
- PWA manifest, raster app icons, offline shell caching, Android/desktop installation and iOS home-screen guidance.
- Vercel automatic deploys from GitHub main.

## Neon database

New Neon project: dealbotsa, ID lingering-scene-12060007.
Schema migration file: db/001_init.sql.
Vercel keeps DATABASE_URL encrypted. A dedicated least-privilege role named dealbotsa_app accesses the app tables.
Each visitor gets a cryptographically random Secure, HttpOnly guest cookie; only its SHA-256 hash is persisted. Guest state is only shared with the same browser, not across devices. The frontend retains local storage as an offline fallback.

API routes:

- GET /api/health: database connection status.
- GET /api/state: load current guest state.
- POST /api/state: save the guest state; log price decreases as simulations or manual values.
- GET /api/history: read recent recorded guest price changes.

No database password, bot token or account secret belongs in frontend code.

## Not yet connected

- Real product prices and automatic retailer scraping: needs approved retailer sources and product data permissions. Takealot terms restrict robots monitoring the platform.
- Production Telegram bot: needs BotFather bot token, user verification, server-side delivery and consent.
- WhatsApp Business notifications: require Meta Cloud API, opt-in and suitable template approvals.
- Automated background price checks: require approved sources, schedulers, error handling and duplicate prevention.
- Full user registration, cross-device accounts, seller/model-level matching and stock verification.

## Suggested next phase

1. Obtain a legitimately usable retailer API or partner feed, initially for one permitted South African source.
2. Add production price observations and compare exact product variants, condition, shipping and loyalty pricing.
3. Connect opt-in Telegram notifications and a scheduled scan worker.
4. Add secure user sign-in, then extend to WhatsApp Business.

This repository is a prototype for client testing; do not represent synthetic deal scores as real market prices.

Developed by WebDevPro.

## Realistic product image collection (October 2026)

Ten product photographs supplied by WebDevPro and optimized as WebP thumbnails are tracked in `public/images/deals/` and are served at `/images/deals/<filename>.webp` on Vercel:

- `bluetooth-speaker.webp`
- `wireless-headphones.webp`
- `wireless-mouse.webp`
- `mechanical-keyboard.webp`
- `smartphone.webp`
- `smartwatch.webp`
- `air-fryer.webp`
- `blender.webp`
- `rc-car.webp`
- `teddy-bear.webp`

The app uses these realistic images in dashboard rows, product cards and detail panels. Assets are concept illustrations rather than verified retailer listing photos. The PWA precaches them for offline previews. The footer credits WebDevPro.co.za and links to the business contact number +27 81 215 9792.
