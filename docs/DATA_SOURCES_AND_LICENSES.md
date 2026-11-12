# Data, License, Privacy and Release Review

Status: **Unverified. Do not treat as commercial clearance.**

1. **Ownership:** confirm rights and attribution for the copied Fintech dashboard, resource images, dependencies and any adapted upstream components. Retain required notices.
2. **Financial data:** independently validate commercial display, caching, rate limits, regional availability and redistribution rights for Binance Spot endpoints and all individual instruments. The current symbols may be delisted or unavailable.
3. **Accuracy:** never represent Binance tokenized equities as underlying US stock prices. Show exact instrument, exchange, currency (USDT), timestamps, actual trade freshness and error/stale states. No invented quotes.
4. **Android permissions:** review overlay and accessibility disclosure, minimum supported OS, package IDs, target API and app-store policy compliance.
5. **Production identity:** generate and protect a stable production signing key separately; test upgrades before distributing to customers. Never commit keystores or secrets.
6. **Web:** review HTTPS/CSP, cookie and privacy notices. Future favorite-site integrations must respect iframe restrictions, site rules and credential boundaries.
7. **Business:** validate NowView trademarks, domain ownership, terms, pricing, refund policy and customer support. Do not claim clearance or publication without evidence.

## Current source-rights clearance status (12 November 2026)

The machine-readable register is `config/commercial-source-rights.json`, and the commercial release check is `node tools/check-commercial-rights.mjs`. All seven categories are intentionally **UNVERIFIED**: Binance market-data display; publisher RSS/headline excerpts; IPTV directory; each separately authorized IPTV broadcast; YouTube official player; social public profile links; and external PipeTv handoff/dependency obligations.

These distinctions matter: a public or freely accessible URL does not grant commercial redistribution rights. No source has been marked cleared without supporting evidence. Rights review must be performed under current provider terms for the proposed customer-facing use, region and delivery mode. A code test cannot approve content licensing.

A formal commercialization sign-off requires the reviewer name, date, source-specific license/terms documentation at an HTTPS URL, and practical testing of geo restrictions and API/playback policies. Keep any private signed agreements outside public GitHub and use an access-controlled evidence link. Without clearance, the release-readiness tool remains **NO-GO**, even if CI, preview smoke and APK builds succeed.
