# Market Dashboard Migration Manifest

- Source: `faisalwrokksa-hub/Fintech`, open draft PR #1, branch `codex/market-charts-tv-20261108`.
- Pinned inspected source snapshot: `061badd5a7a307d0ad3225c60917c79e3dd0a5aa`.
- Destination: `faisalwrokksa-hub/nowview`, branch `feat/market-dashboard-baseline`.
- Method: dashboard-related files copied into independent history in NowView. Fintech was not changed.
- Copied files (29):
  - `.dockerignore`
  - `.github/workflows/dashboard.yml`
  - `.gitignore`
  - `Dockerfile`
  - `android/AndroidManifest.xml`
  - `android/res/drawable/banner.xml`
  - `android/res/drawable/icon.xml`
  - `android/res/values/strings.xml`
  - `android/res/xml/home_panel_service.xml`
  - `android/src/dev/fintech/marketcharts/ChartsView.java`
  - `android/src/dev/fintech/marketcharts/HomePanelService.java`
  - `android/src/dev/fintech/marketcharts/MainActivity.java`
  - `android/src/dev/fintech/marketcharts/MarketData.java`
  - `build-apk.ps1`
  - `build-apk.sh`
  - `cloud/build.mjs`
  - `cloud/market.mjs`
  - `dashboard.py`
  - `package.json`
  - `tests/cloud.test.mjs`
  - `tests/indicators.test.mjs`
  - `tests/live.test.mjs`
  - `tests/test_dashboard.py`
  - `web/app.js`
  - `web/index.html`
  - `web/indicators.js`
  - `web/live.js`
  - `web/market-data.mjs`
  - `web/style.css`

## Deliberately excluded
- Telegram bot source and its periodic workflows, secrets and any credentials.
- `.openai/hosting.json`: source-specific deployment binding.
- `dist/server/index.js`: generated output; build from source instead.
- Fintech's original root README (NowView has its own).
- Fintech's commercial plan (scope incorporated into NowView's master prompt).

## Follow-up work
- **Not yet rebranded:** Android package `dev.fintech.marketcharts`, visible Market Charts strings, APK filename and Python user agent remain for baseline test compatibility. Change them in separately validated steps before public sale.
- Existing original CI/test status **does not certify** this new repository; run dedicated NowView CI and physical-device QA.
- Audit license provenance of every migrated file and market-data redistribution rights.
- No production APK, website or git merge authorized.
