# NowView — preview release-gate checklist

The Android TV and mobile application retains the existing package ID `app.nowview.markets` to avoid breaking updates to the installed test package, while the user-facing Android label is now **NowView**. No public production channel or final product identity has been approved.

## CI-enforced checks
- Node unit/regression tests and syntax checks for the web/cloud application.
- Python offline test suite.
- Build of six-workspace web assets and the Android TV/mobile APK.
- APK signature verification and `aapt` checks for the intended installed package and display label.
- ZIP inventory of all required workspace JavaScript and style assets in the APK.
- Current packaging uses a **temporary local/test signing identity**. The build is **not a production-signed release**.
- No paid data feed, customer authentication, external scraping, commercial code import, remote CSV storage, production merge or deployment.

## Requires owner/device acceptance before publication
1. Install APK on supported Google TV, Android TV and Android mobile hardware; verify D-pad navigation and Back from PipeTv/browser.
2. Confirm file picker and CSV reading from installed document providers and local-only processing.
3. Verify correct behavior with network offline/limited conditions for market quotes and RSS; no synthetic data substituted.
4. Verify YouTube official iframe permissions on hosted web, actual ad disclosures and separate PipeTv operation on TV.
5. Accessibility review: focus order, captions, contrast, font scaling and responsive layouts.
6. Legal review of third-party dependencies, app distribution, privacy disclosures, brand/trademark and API terms.
7. Supply secure reproducible production signing with approved versioning, a release channel and rollback plan. Never use the local test keystore to sign a commercial release.
8. Owner review and explicit permission before merging draft PR, enabling domains, public hosting or publishing APKs.

## Feature readiness
- MyView: local widget selector and layout storage; no account sync.
- Markets: token chart sourced from Binance public data; U.S. securities watchlist has no verified licensed quote feed.
- Business: local CSV analysis; no server-side customer record management.
- News: allowlisted Federal Reserve and SEC RSS headlines.
- Media: external installed PipeTv handoff on Android TV; hosted web official YouTube embeds may show ads.
- Social: locally stored public profile links; not a live post ingestion or sentiment platform.

The checklist describes **preview-code readiness only**. Passing automation alone is insufficient for a public commercial product.
