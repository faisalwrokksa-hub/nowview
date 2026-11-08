# NowView — Free-first data, media and news integration strategy

**Status:** Contributor architecture plan, not a verified set of commercial data licenses, live channel agreements or platform approvals. This document augments `CONTRIBUTOR_MASTER_PROMPT.md`. **Never assume a public URL is legally redistributable.**

## Product scope
NowView is one application with a shared premium dark-and-gold theme and selectable workspaces. The first commercial objective remains **NowViewMarkets**. Later add **NowViewBusiness**, **NowViewMedia**, **NowViewNews**, and customizable **MyView**. No new app/repository is needed for OneDashboard: use `faisalwrokksa-hub/nowview` as the unified shell.

All integration modules must use **free-first**, low-cost, lawful, reliable data, without trading permission, scraping that violates platform conditions, bypassing geographic restrictions, unauthorized IPTV relays, or embedding login credentials into mobile/TV binaries.

## Integration matrix

| Source | Intended widget | No-payment implementation | Important condition |
|---|---|---|---|
| Binance Spot market-data-only REST | Binance spot chart/quotes | `https://data-api.binance.vision/api/v3/` | Public unauthenticated endpoints; verify commercial redistribution rights and regional symbol availability. Never represent a Binance token as its underlying U.S. stock. |
| Binance public market-data WebSocket | Streaming candles, trades, change | `wss://data-stream.binance.vision` | Reconnection, staleness, rate limits and source timestamps; public data only. |
| U.S. stocks/indices | U.S. market watchlist | Adapter reserved; provider not selected | **Binance does not supply official U.S. securities/indices.** A free official/commercially redistributable provider and delay terms must be verified before showing values. Until then display unavailable, not fake/substituted values. |
| Publisher-owned RSS/Atom feeds | Headline cards, business/news insights | Parse whitelisted feeds; link to original item | Check publisher's commercial-use/republication permissions, update frequency, attribution and allowed excerpt length; avoid copying full articles. |
| Official live news TV channels | Video cards/live player | Prefer authorized official page/YouTube embed; add owner-approved HLS/DASH only with permission | Publicly accessible streams are not automatically licensed for restreaming, rebroadcasting, proxying or resale. No unauthorized M3U playlist mirrors. |
| YouTube | Channel subscriptions, news-video discovery, official player | Approved iframe player; Data API quota when useful | Use official player and APIs, preserve platform controls/branding/ads and content restrictions, handle quotas; no ripping, ad removal, redistribution or bypassing embedding restrictions. |
| X (Twitter) | Public-post highlights or source links | Link cards and permitted official embeds when supported | Broad public-feed search/retrieval may require paid API access. No claim of an unrestricted free public API; avoid unauthorized scraping. |
| TikTok | Creator videos and public profiles | Official embeds and user-authorized Display API when approved | Display API requires developer approval, login/token permissions and creator authorization; not a universal public-content feed. |
| Facebook | Public Page updates | Official Page embeds/links where allowed | Broad Page posts Graph API access depends on permissions/app review; no arbitrary public social-feed scraping. |
| Other feeds | Later connectors | Standardized adapters | Must meet provenance, privacy, terms, attribution, and costs policy before activation. |

## Reference official documentation

- Binance Spot public market-data-only endpoints: https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md
- Binance Spot websocket streams: https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md
- YouTube API and embedding: https://developers.google.com/youtube/apis ; https://developers.google.com/youtube/iframe_api_reference
- TikTok Display API: https://developers.tiktok.com/docs/en/display-api-overview ; https://developers.tiktok.com/docs/en/display-api-get-started

Confirm documentation and terms again when writing each adapter, especially pricing and commercial reuse. An absence of developer fees **does not grant a right to resell, sublicense or cache the data**.

## Architecture and data contracts

```text
NowView App (Web / Android TV / Tablet / Mobile)
  ├── Shared layout, account/session, widget library, theme, navigation
  ├── NowViewMarkets (first saleable product)
  │    ├── BinanceMarketAdapter (existing, read-only; actual token/crypto quotes)
  │    └── UsEquitiesAdapter (disabled until verified licensing/provider)
  ├── NowViewNews (RSS/Atom + source click-through; publisher permissions)
  ├── NowViewMedia (authorized official embeds; approved live channels)
  ├── NowViewBusiness (future owner-authorized business data)
  └── MyView (future user-picked widgets)
       ↕
  Source registry, cache/cooldown, permission guard, quote/content timestamps
```

Each adapter should implement:
- `sourceId`, `sourceName`, `sourceUrl`, `dataType`, `instrumentId` or `contentId`, `currency`/unit, `observedAt`, `fetchedAt`, `freshness`, `delayLabel`, `attribution`, and `rightsStatus`.
- A result status of `live`, `delayed`, `stale`, `offline`, `unavailable` or `permission_required`; never use simulated content as actual data.
- Policy metadata: `commercialDisplayAllowed` (verified), `embedAllowed`, `redistributionAllowed`, `maxCacheAge`, `allowedOrigins`, `apiCost`, `regionRestrictions` and an evidence/reference URL.
- Strict allowlisting and URL validation (no SSRF, private-network fetch, open relay/proxy, leaked keys, unapproved embedding domains).
- Exponential backoff, jitter, bounded retries, source rate-limit controls, record age and explicit user-visible failure states.
- Separate customer entitlement, if future paid features use a source requiring data licenses.

For a video or article, show title, authorized thumbnail, original source/channel, publication time and a clickable canonical URL. In-app video playback is **only** for explicitly embeddable/licensed streams and only with their required controls, branding and restrictions.

## Free-cost implementation priorities

### Phase A — NowViewMarkets core
Preserve existing Binance API code, verified exchange symbols, source disclosure, live trade/candle data, indicators, stale warnings and TV focus. Treat crypto tokens and U.S. equities as distinct instrument types. Current U.S. stock rows must remain clearly unconnected until approved data rights exist.

### Phase B — NowViewNews minimal implementation
Build a generic RSS/Atom parser and simple headlines widget, but do not preconfigure copyrighted publisher feeds for commercial use until their individual conditions are checked. Restrict to owner-approved and valid HTTPS feeds; source link always prominent. Allow manual feed entry only after validating URLs for private-network fetch protection, content size and security.

### Phase C — NowViewMedia
Implement an authorized-video player framework with YouTube official embed first, then channel-specific embed options. No arbitrary IPTV playlist import as a default public feature. An M3U/HLS URL is usable only if the content owner explicitly authorizes inclusion, or if it is a customer-controlled licensed stream. Do not proxy, rip, record or redistribute streams.

### Phase D — Social posts
Start with **open original links** and official share/embed support where platform-approved. For authenticated account feeds, request the user's voluntary authorization through approved OAuth flows and only authorized scopes. Do not promise broad unattended X/TikTok/Facebook feed APIs for free.

### Phase E — Personalization
Enable user-pinned widgets and source selection while retaining free-tier request budgets. Consider authentication and synchronization only when necessary; minimize stored personal data.

## TV-specific UX
- Use the same dark green/charcoal, warm gold, green/red market-change colors and large focus indicators throughout all workspaces.
- Provide a top-level workspace switcher (TV remote, touch and keyboard), not separate APKs for every module.
- Allow one large market chart with compact headline cards and an authorized news player beside it; avoid auto-playing media unexpectedly.
- When feeds fail, show a graceful stale/offline placeholder, with last-update time and an optional link to the source.
- Keep animation and video resource use bounded for low-powered TVs.

## Release and security requirements
- Tests must cover invalid feeds, HTTPS allowlists, stale handling, rate limits, malformed XML/JSON, malicious URL redirects, HTML sanitization, unsupported iframe embeds and unauthorized stream lists.
- No permanent API secrets in app bundles. Never introduce production hosting secrets into GitHub PR workflows.
- Do not merge to main, release, publish, buy services, or connect paid API keys without separate owner authorization.
- Commercial licensing audits and platform policies must be completed before commercial launch.

## Immediate contributor task
**Implement only an independent source registry and safe RSS/headline adapter prototype** on the existing NowView draft branch after verifying the current tree; leave market sources unchanged. Add tests and clearly label the integration as development-only. Defer new media/social API dependencies until their permissions and terms have been checked.
