# DealBotSA — Interactive Client Demo

DealBotSA is a self-contained, responsive product-deal monitoring prototype designed for South African retailers. The application is hosted on Vercel and automatically deploys from this repository's main branch.

**Demo URL:** https://dealbotsa.vercel.app/

## What already works in the demo

- Overview dashboard with illustrative savings, deal ranking and coverage.
- Discover deals with search, retailer filters, category tabs, minimum-discount thresholds and sorting.
- Product detail panels with sample deal scores, retail reference prices and example savings.
- Add or remove watchlist items, including manually added products with validated HTTPS retailer URLs.
- CSV export for watched items.
- Rule builder: target category, retailer, minimum discount and optional maximum price.
- Manual rule testing and demo checks; matching sample products create in-app notifications.
- Local notification inbox and optional browser notifications, while this app is active.
- Reset demo and retention of changes via browser localStorage.
- Mobile-friendly navigation and responsive layout.

## Important prototype boundaries

All product examples, prices, discounts, and scores are **illustrative test data**. Retailer products and offers **are not fetched or independently verified**. No recurring background jobs exist yet.

The following are **not connected** in the demo:
- Real price feeds from Takealot, Amazon ZA, VodaPay / VodaBucks, or Checkers.
- Telegram Bot API messaging.
- WhatsApp Business Platform messaging.
- A shared user-account backend/database.
- Background scheduled price monitoring.

This is intentionally an honest proof-of-concept, rather than a misleading "live" scraper.

## Suggested production architecture

1. **Data sources:** Approved retailer feeds or partner APIs; evaluate licensing/terms for each target source. VodaBucks is accessed via the VodaPay app and may need a commercial integration agreement. Takealot's platform terms restrict automated robots monitoring the site.
2. **Normalization:** Standardize product identifiers, brand, specific model/variant, size, current price, comparison/reference price, stock, delivery cost and eligibility conditions for loyalty offers.
3. **Price-history database:** Supabase Postgres tables for users, merchants, products, normalized offers, price snapshots, watchlists, rules, notification deliveries and job health.
4. **Scheduled workers:** Vercel Cron or a separate queue/worker that pulls authorized data sources on a permitted interval, records snapshots, de-duplicates unchanged prices, and identifies thresholds.
5. **Notifications:** Telegram Bot API as MVP, using server-managed credentials and chat opt-in. WhatsApp Business Cloud API can follow, using opt-in and applicable template/messaging rules.
6. **Reliability:** Bot rate limits, retries, duplicate suppression, error logging, freshness indicators, regional pricing, price-source provenance and seller-quality checks.
7. **Security:** Secrets live on the server; never embed bot tokens or retailer keys in frontend JavaScript. Authenticate customer accounts and implement per-user access controls.

### Suggested database tables

- profiles (id, email, telegram_chat_id, consent)
- retailers (id, name, integration_type, enabled)
- products (id, gtin, brand, model, name, category)
- offers (id, product_id, retailer_id, url, condition, seller, shipping_price)
- price_history (offer_id, observed_at, price_zar, stock, eligibility)
- alert_rules (id, profile_id, category, retailer_id, min_discount_pct, max_price_zar, active)
- watchlist (profile_id, product_id)
- alert_events (rule_id, offer_id, event_time, status)
- deliveries (alert_event_id, channel, attempted_at, sent_at, status)

## Deployment

Static HTML/CSS/vanilla JavaScript. No install step or environment variables required for the demo. Vercel will serve index.html.

Production connectors should use a separate server-side implementation and must not be represented as active until successfully configured and verified.

Built for client demonstrations by WebDevPro.
