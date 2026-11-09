# NewView website improvement research — 2026-11-09

Scope: Expert 2 frontend / Android, not Expert 1's commercial backend. Research references below are **external public repositories**, not imported source. No third-party code was copied.

## Comparable open-source projects

| Project | URL | Useful feature | How NewView should adapt | License/caveat |
|---|---|---|---|---|
| Homarr | https://github.com/homarr-labs/homarr | Drag/drop dashboard, app cards, search | Editable MyView layout and keyboard/remote reorder fallback | Apache-2.0; retain notices if copying |
| Glance | https://github.com/glanceapp/glance | Compact markets/RSS/video widget composition, configurable caching | High-density Home layout with clear timestamps and stale labels | AGPL-3.0: avoid copying its code into proprietary distribution without counsel |
| Homepage | https://github.com/gethomepage/homepage | Provider proxy, widgets and fast cached feeds | Server-side adapters with explicit source status; no API keys in JS bundle | Check current license and provider rights |
| Lightweight Charts | https://github.com/tradingview/lightweight-charts | Interactive performant charts | Benchmark against existing market canvas before adding library | Apache-2.0 + mandatory TradingView attribution/NOTICE |
| FLauncher fork | https://github.com/zompinc/flauncher | Android TV app grid, wallpaper, D-pad/air-mouse navigation | Native Android adapter and recovery; web should not pretend app discovery works | GPL-3.0; reference interactions, do not blindly migrate code |
| IPTV Player | https://github.com/canyurdugul/iptv-player | Channels, favorites, HLS and search | Single player controller, playlist validation and recently watched | Media/provider permissions and dependency licenses must be reviewed |
| PWABuilder | https://github.com/pwa-builder/pwabuilder | Installability and manifests | Manifest, icons, offline shell, mobile install tests | Avoid service worker caching of credentials or sensitive pages |
| iptv-org | https://github.com/iptv-org/iptv | Public IPTV catalog and EPG links | Source discovery only after channel-by-channel availability/rights checks | A playlist link is not proof of redistribution rights |

## Directly verified gaps in the current NewView branch
1. **Six workspace tabs**, versus product requirement of **five** (News and Media must become one Watch & News). `watch.js` exists on review branch but is not loaded.
2. **Missing APK Home assets** and eight divergent web modules. Preserve original installed APK and signing identity.
3. **Cloudflare Pages staging artifact exists**, but actual Pages project is not yet connected or deployed.
4. Market APIs have source quality, stale-data and license review gates; do not claim source freshness merely because browser is online.
5. Third-party TV/content APIs have licensing and stream compatibility risks. Prefer one maintained playback session.

## Prioritized implementation plan

**P0: Source and usability reliability**
- Complete F1 APK source alignment and deterministic regression coverage.
- Resolve five-workspace navigation and keep video session across workspace switching.
- Validate errors/offline states per widget; distinguish browser connectivity from actual provider health.
- Run keyboard/D-pad focus order and visible focus tests before deployment.

**P1: Upgrade MyView**
- Add layout presets and a lightweight widget registry for Markets, RSS, video, Business shortcuts and Social bookmarks.
- Use device-local persistence first, then Expert 1's versioned preferences API when verified.
- Add drag-and-drop only as an optional pointer enhancement; always offer keyboard/remote move buttons.

**P1: Content experience**
- Lazy-load offscreen widgets; pause nonessential polling in hidden tabs.
- Add source, publication time and explicit stale data labels.
- Add one provider-neutral video lifecycle and bounded retry; no DRM bypass.

**P1: Cross-device**
- Formalize responsive breakpoints and touch targets.
- Create an installable PWA with versioned cache for public shell assets, avoiding cache of authenticated responses.
- Test iPhone/iPad Safari separately; browser installability is not native Android launcher behavior.

**P2: Optional chart enhancement**
- Benchmark Lightweight Charts for candlestick accessibility and real-time updates.
- Preserve custom indicators and do not replace validated market adapters without comparative tests.
- Add license attribution to UI if adopted.

**P2: Internationalization**
- Extract interface strings into resource dictionaries instead of duplicating dashboards.
- Add explicit RTL layout support and avoid hard-coded directional placement.

## Safe implementation delivered this round
- `web/connectivity.js`: accessible browser online/offline state in the header, no telemetry or API health assertions.
- Styles for status and reduced-motion accessibility.
- Cloudflare Pages Worker asset mapping updated to serve the module.
- `tests/connectivity.test.mjs`: online/offline, no duplicate initialization and event cleanup.
- GitHub CI updated to run these tests. No new backend endpoint or production deployment.

## Acceptance before marking new features shipped
- GitHub CI pass and actual Chrome/Edge/Firefox/Safari browser behavior on devices.
- Android TV remote focus, media lifecycle and signing continuity independently verified.
- Source, license, timestamp, fallback and offline behavior reviewed for each provider.
- Owner approval before merging PR #3 or deploying production.
