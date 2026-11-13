# NEWVIEW — MASTER REPOSITORY ALIGNMENT INSTRUCTIONS

> **2026-11-13 current-code reconciliation:** This document records the historical `NewView-Home-1.0.260-signed.apk` comparison and an earlier five-tab target, **not** the current web navigation or verified Android release contract. Current merged dashboard UI uses **Home, Watch, Discover, Settings** (see PR #182 and `web/simplified-ui.js`). Older MyView/Markets/Business/Watch & News/Social descriptions below are preserved for APK provenance only. Do not restore five tabs or change Android package/signing identity solely from this archival specification. Final Android identity, device screenshots, migration and in-place upgrade remain gated by the release acceptance matrix.

**Baseline:** uploaded `NewHome Apk.zip` containing `NewView-Home-1.0.260-signed.apk`. The APK is the currently working **user-reported** Android installation; successful device behavior is not independently verified.

## Non-negotiable identity and migration
- **Current APK application:** `app.newview.dashboard.repair`, version `1.0.260-repair` (per handover; verify using Android SDK `aapt` before release).
- **Legacy repository application:** `app.newview.dashboard`, candidate `1.0.1-rc1`.
- The two packages are separate installations. **Do not overwrite the legacy manifest or silently change signing keys.**
- Keep `app.newview.dashboard.repair` as the proposed aligned Android package until the owner explicitly approves migration.
- Preserve existing user data, wallpaper, original launcher and signing certificate. Without the exact current repair signing key, an in-place upgrade is blocked.
- Never merge this alignment branch to main or release a replacement APK before hardware acceptance.

## Source-of-truth hierarchy
1. Exact packaged APK assets and identity for describing **what is in the working binary**.
2. `Pasted text(2).txt` handover for intended product interactions and future requirements.
3. Existing repository for reusable source code and tests.
4. New implementations only after behavior is verified and gaps are identified.

**Important:** An APK is not a full source archive. Java/Kotlin source, Gradle configuration, signing keys, original build instructions and source history cannot be reconstructed reliably from DEX. The actual `NewView-Home-1.0.260-source.zip` remains required for full reproducibility.

## APK asset inventory
The uploaded APK includes these exact relative assets:
```
assets/index.html
assets/app.js
assets/business.js
assets/channel-filters.js
assets/external-links.js
assets/home.css
assets/home.js
assets/indicators.js
assets/live.js
assets/market-data.mjs
assets/media.js
assets/myview.js
assets/news.js
assets/public-sources.js
assets/refined.css
assets/rss.js
assets/social.js
assets/stock-board.js
assets/style.css
assets/tiger.png
assets/topics.js
assets/watch.js
assets/workspace-shell.js
assets/THIRD-PARTY-NOTICES.txt
```
The legacy repository does not include `home.css`, `home.js`, `refined.css`, `rss.js`, `topics.js`, `watch.js` or `tiger.png` in its `web/` tree. Do not claim source alignment until these assets are incorporated and their exact hashes verified.

## Historical five-tab APK experience (not the current four-section web navigation)
1. **MyView:** personalized, editable overview and locally persisted widgets.
2. **Markets:** actual exchange instruments and quotes, line/candlestick chart, EMA20/50, Wilder RSI14, closed-candle alerts, freshness labels.
3. **Business:** isolated embedded `https://app.theepmo.com/` portal with safe authentication; local CSV analytics remain an optional tool.
4. **Watch & News:** live TV, video, headlines, shared playback and integrated news reader.
5. **Social:** authorized public RSS/Atom feeds and separate bookmarks, with attribution and timestamps.

### Android TV Home composition
- Existing dark tiger wallpaper.
- Riyadh clock/date top-left; up to three attributed headlines across top.
- Network, Apps, Settings top-right.
- MR7 TV, Video and Live TV shortcuts below quick controls.
- Historical APK baseline: five-tab workspace navigation below header; current navigation must be validated independently on hardware.
- Equal left dashboard and right video panels in normal viewing mode.
- Chart expand/restore takes available space; where provider permits, video can remain audio-only without spawning a second player.
- No large bottom dock; no dependence on Plume, NewPipe, SmartTube, TizenTube, Automate or accessibility overlays.
- Remote D-pad, OK, Back, Home and touch/phone responsive layouts.

## Implementation rules
- Preserve the APK's functioning Home shell and navigation behavior first. Do not replace it with the older six-tab dashboard.
- Review Media3/ExoPlayer source and actual runtime behavior before modifying the shared player.
- Remote web pages (including the THEEPMO portal and news reader) must not receive a privileged Android JS bridge.
- Keep source timestamps, source attribution, unavailable/error/offline states, and real data only.
- Validate Binance symbols against actual exchange metadata; never substitute stock quotes.
- Keep HTTPS and validate URLs, XML, redirects and remote navigation.
- Avoid unnecessary permissions, duplicate timers, extra players, unbounded network requests and hidden focusable controls.
- No production signing keys in Git.

## Repository alignment acceptance gates
| Gate | Required evidence |
|---|---|
| A. APK inventory | Manifest/package/version, signing fingerprint, asset list and SHA-256 hashes |
| B. Source recovery | Original source archive received; exact asset comparison against APK |
| C. Reproducible build | Build produces equivalent app features from tracked source |
| D. UI verification | Physical projector screenshots: header, agreed current navigation, split view, expanded chart |
| E. Functional verification | D-pad, video switching, RSS, market alerts, portal login, offline recovery |
| F. Signing and migration | Certificate continuity and safe upgrade test |
| G. Release | New signed APK, checksum, test matrix and rollback procedure |

**Status:** A partially inspected; B blocked pending source archive; C–G not verified. The repository currently contains this alignment contract, **not** the complete new source implementation.
