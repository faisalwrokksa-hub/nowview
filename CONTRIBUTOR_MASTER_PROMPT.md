# NOWVIEW — MASTER CONTRIBUTOR PROMPT & DELIVERY PLAN
Version: 1.0 | Initial scope: commercial market dashboard | Status: Authorized planning and review-only implementation

> **PRIMARY DIRECTIVE**
> Build **NowView** into a beautiful, stable, legally reviewable, commercially resellable universal dashboard **starting from the existing Market Charts app**. Work in coherent, independently testable batches. Never use an unbuilt future feature as a prerequisite for the first release. Preserve the original `Fintech` repository unchanged. Submit all code as reviewable changes in **NowView** only; do not merge, deploy, buy services, change DNS, or distribute APKs without separate user authorization.

## 1. Product vision and user journey

**Brand:** NowView
**Tagline:** Everything you follow. Live.
**Proposed website:** `nowview.si` (ownership, trademark rights and DNS setup **not verified** in this repository).
**Position:** A personal, customizable dashboard on Android TV, Android phone/tablet, and modern web browsers. iOS/iPadOS users access it by web/PWA; an Android APK does not run on iOS.

**Launch experience (v1):**
1. User opens Android TV app or web dashboard.
2. An elegant, fast, legible market screen shows a watchlist, selected instrument, timeframe, real source and quote freshness, price chart and optional indicators.
3. User navigates by TV D-pad or touch, chooses instruments, saves simple preferences, and may enable/disable alerts.
4. If data fails or is stale, the screen clearly says so; it never invents a price or substitutes an underlying US security for a tokenized instrument.
5. App operates read-only: no brokerage access, transaction execution, wallet permissions, or privileged credential collection.

**Future vision:** Add account-based personalization, favorite websites and permitted embeds, optional streaming media and picture-in-picture, and eventually AI-powered insights/agent events. Design extensible boundaries, but **do not implement the entire future vision in v1**.

## 2. Commercial customer priority

1. **Traders and investors:** first launch audience; valuable chart, market and watchlist features.
2. **Finance professionals:** simple monitoring and shared display presets.
3. **CEOs and business owners:** business widgets and approved integrations in later releases.
4. **PMO/enterprise teams:** organization dashboards and agent integrations only after identity, authorization and audit architecture exist.

Do not pivot v1 into an AI company operating system, full social network, replacement for THEEPMO, or general browser.

## 3. Verified starting point / source boundaries

Source: `faisalwrokksa-hub/Fintech`, draft PR [#1](https://github.com/faisalwrokksa-hub/Fintech/pull/1), branch `codex/market-charts-tv-20261108`.
The source PR is open/draft; **not a production release**.

Known source areas (inspect actual files before editing):
- `web/`: `index.html`, `app.js`, `style.css`, `live.js`, `indicators.js`, `market-data.mjs`.
- `android/`: `AndroidManifest.xml`, Java `MainActivity`, `ChartsView`, `MarketData`, optional `HomePanelService`, resources.
- APK scripts: `build-apk.sh` and `build-apk.ps1`.
- Cloud/backends: `cloud/build.mjs`, `cloud/market.mjs`, `dashboard.py`, `Dockerfile`, `package.json`.
- Tests/workflow: `tests/`, `.github/workflows/dashboard.yml`.
- Original planning: `COMMERCIAL_MVP.md` on the source PR branch.
- The original repository also runs **SOXL/SOXS Telegram intelligence**; **never copy its bot, secrets, private configuration, schedule or automated messages** into NowView.

Source currently supports 19 explicitly identified Binance Spot USDT pairs (including Binance tokenized-equity-style symbols and BTC/ETH), synchronized candles, live streams with fallback, EMA(20/50), RSI(14), visible trade timestamps, alerts, and optional TV Home panel. Verify each instrument's current listing and commercial data rights; do not assume continued availability or regional legality.

**Migration method:**
- Read and document the current implementation, dependencies, files, branches and tests.
- Copy **only** dashboard-related source and permitted assets into NowView, maintaining attribution and license files as required.
- Preserve each original file's logic unless modifying it for a documented defect, security concern or NowView rebrand.
- Do not import original git history wholesale or `Fintech`'s Telegram code. Never copy release signing keys or secrets.
- Keep an explicit migration manifest listing source paths, included/excluded content and reasons.
- Treat upstream pull request descriptions as claims; independently run and record tests.

## 4. Implementation principles (non-negotiable)

- **Build on current code; avoid unnecessary rewrites.** Share the same market semantics between Android and web where possible.
- **TV-first UX:** readable 3m away, consistent remote focus, predictable Back/Home, minimal loading jitter, dark high-contrast palette, no unexpected popups, accessible font scaling.
- **Mobile/web compatibility:** touch-friendly responsive design, keyboard navigation, graceful small screens. Do not make a desktop layout merely shrink.
- **Data integrity:** quote/candle IDs, timestamps, session status, intervals, local source, last updated and stale thresholds must be explicit. No invented prices or financial advice claims.
- **Performance:** bounded memory, throttled redraws, reconnect/backoff, avoid unnecessary high-frequency repainting and battery/network drain.
- **Privacy/security:** allowlisted public market endpoints, least privilege, no unnecessary cookies or analytics, HTTPS, safe URL validation and no credential collection from embedded websites.
- **Provider compliance:** check terms for commercial use, API quotas, display, caching and redistribution **before charging customers**. Regional restrictions must not be bypassed.
- **No automatic execution:** read-only markets; no unattended purchases, production deploys, DNS changes, releases or merges.
- **Quality:** each batch includes updated docs, tests, user-visible demo/QA evidence, and rollback notes. No unsupported claims that testing passed.

## 5. Architectural layout — target, not a forced rewrite

```text
nowview/
  README.md
  CONTRIBUTOR_MASTER_PROMPT.md
  docs/
    MIGRATION_MANIFEST.md
    ARCHITECTURE.md
    PRODUCT_ROADMAP.md
    RELEASE_CHECKLIST.md
    DATA_SOURCES_AND_LICENSES.md
    PRIVACY_AND_SECURITY.md
  web/                     # existing shared visual UI + market data modules
  android/                 # Android TV/phone WebView host (current Java code)
  cloud/                   # optional web adapter/build, only where authorized
  tests/                   # indicator, market, chart, UI-contract, security tests
  .github/workflows/       # tests + unsigned/test artifacts; never production keys
  build-apk.sh
  build-apk.ps1
```

The exact tree may evolve after inspection. Do not impose a heavy framework unless benefits outweigh migration risk. Separate platform UI, data adapters, settings storage and future authenticated integrations with straightforward boundaries.

## 6. Five parallelizable workstreams

### W1 — Core market reliability (P0)
**Owner role:** data/market engineering
- Inventory source APIs and all 19 symbols; map human-readable labels to actual exchange identifiers.
- Validate trade time and freshness rules, REST/WebSocket parity, OHLCV interval/time-zone behavior, discontinuities, delistings, 429/rate limits, reconnect and offline state.
- Cross-check EMA and RSI with known fixtures; no crossing alerts based on unfinished candles; never replay first-load historical alerts.
- Persist only safe app settings, not trading credentials.
**Evidence:** tests with historical fixtures, failure injection, stale displays, API terms review.

### W2 — TV and responsive interface (P0)
**Owner role:** product design + frontend
- Preserve functional baseline; modern, branded NowView home view, clean cards, chart hierarchy, source and stale status, simple watchlist.
- Support couch distance, remote focus on refresh, screen resolution changes, large text, contrast, visual states, easy exit.
- Touch/desktop variants without broken layout; no overlaps or clipped controls.
- Optional Home overlay remains *off* unless user enables and grants permissions. Never show over third-party video apps.
**Evidence:** before/after visuals, TV navigation checklist, responsive snapshots, accessibility review.

### W3 — Android packaging & QA (P0)
**Owner role:** Android/build engineering
- Check minimum SDK/target version, stable unique application ID, versioning, manifest, optional permissions and accessibility disclosures.
- Maintain repeatable Java 17 + Android SDK build; build a test APK in CI.
- Release signing must use protected user-controlled keystore outside Git and must support future app upgrades.
- Test clean install, upgrade, restart, wake, network interruptions, TV D-pad, tablet touch, browser WebView availability.
**Evidence:** build logs, tested device matrix, APK hashes; never expose signing material.

### W4 — Web, hosting readiness & personalization (P1)
**Owner role:** web/platform engineering
- Keep local web functional before deployment; evaluate PWA manifest, service worker caching without misleading stale market quotes.
- Make dashboard responsive on iOS/Android/mobile and desktop.
- Keep first release lightweight. Customer login, saved cloud preferences and favorite websites are **later** after secure auth, per-user authorization and ownership requirements are approved.
- For future favorite sites: maintain safe URL policies; use browser tabs/Custom Tabs when sites disallow iframe embedding. Never bypass frame restrictions or handle third-party passwords.
**Evidence:** Lighthouse/accessibility/performance and cross-browser device checks; no public deployment without approval.

### W5 — Commercial, release & documentation (P0)
**Owner role:** product/security/QA
- Verify code licenses, proprietary assets, font/icon licenses, source exchange terms, trademark collisions for NowView and the proposed domain.
- Define privacy policy, terms, data limitations and liability wording, support channel, release notes, installation instructions, free/premium feature boundaries, charging/billing only after approval.
- Validate installation/onboarding copy and product screenshots. Keep marketing factual.
- Maintain an up-to-date release checklist and risk register.
**Evidence:** license inventory, approved policy drafts, reproducible release QA checklist.

### Coordination
Workstreams may prepare parallel PRs against `main` or an approved integration branch; avoid overlapping changes to the same files. Bundle compatible changes and minimize manual approvals **for safe draft/review work only**. Never infer approval for merges/releases, paid APIs or deployment.

## 7. Release phases and acceptance gates

| Phase | Goal | Completion criterion |
|---|---|---|
| 0 — Initialize | Private repo, scope, contributor docs | Structure and permissions verified; source still unchanged |
| 1 — Baseline migration | Dashboard-only code in NowView | All migrated paths documented, tests running; no bot/secrets copied |
| 2 — Harden | Market accuracy + stability + TV UX | Automated tests and real-device QA evidence pass |
| 3 — Commercial readiness | Licensing, signing, privacy, onboarding | All critical legal/security/operational gates addressed |
| 4 — Limited beta | Small customer cohort | Install/update feedback and failure metrics reviewed |
| 5 — General release | Sell NowView Markets | Explicit product-owner approval; signed APK and website distribution validated |
| Later — Personalized web | Accounts, layouts, favorite sites | Secure tenancy/session design reviewed; tested cross-device sync |
| Later — Media and AI | Video, feeds, AI assistants | Permissions, provider terms, consent and product demand confirmed |

### No-Go conditions
Any of the following blocks public sale:
- Incompatible or unknown market data redistribution rights.
- Missing source accuracy/freshness labels or silent substitution of instruments.
- Broken production signing/upgrade path or APK security review.
- Unresolved severe crashes, focus traps, data corruption, critical privacy risks or secrets in history.
- Unsupported marketing claim of live prices or AI, unclear customer terms, or missing manual release approval.

## 8. Minimal commands to verify after migration

Source references (inspect and adapt paths after migration):

```bash
python -m unittest discover -s tests -v
node --test tests/cloud.test.mjs
node --test tests/indicators.test.mjs tests/live.test.mjs
bash build-apk.sh
```

For Windows, the source includes `build-apk.ps1`. It requires appropriate Java 17 and Android SDK components. A green CI build is necessary but **not sufficient** for commercial release.

## 9. Contributor operating prompt — copy/paste into any coding agent

You are a senior engineering contributor to NowView, a private SaaS-ready dashboard product. Your task is to improve the current **market dashboard** toward a commercial first release. Read `README.md` and this entire `CONTRIBUTOR_MASTER_PROMPT.md` before changing any code.

**Authority:** You may inspect source, research technical constraints, create non-destructive development branches, implement and test code, update documentation, and open **draft pull requests** in `faisalwrokksa-hub/nowview`. Prioritize bulk cohesive progress with safe internal approval of development steps. You are **not** authorized to merge to main, release/ship paid APKs, publish sites, purchase services, change DNS, move repositories, change permissions, access customer secrets or implement trading. Ask only for decisions that are genuinely irreversible or require external owner permissions.

**Before coding:**
1. Read current NowView tree; check whether baseline migration already exists. Never duplicate or overwrite a collaborator's work.
2. Review the source Fintech dashboard PR #1 and only copy authorized dashboard paths, with license attribution and a migration manifest.
3. Identify the smallest coherent next improvement and its acceptance criteria. Confirm no unrelated scope increase.

**While coding:** Work in isolated draft PRs; do not modify Fintech. Implement tests and explicitly handle failure states. Preserve screen navigation and chart calculations. Make all screens usable on Android TV. Record source version, dependencies, any licensing uncertainties and screenshots/build evidence.

**Required final update format:**
- **Done:** actual committed work, branch, files, PR URL, commit SHA.
- **QA evidence:** commands/test results, device-tested vs not tested, known limitations.
- **Risks/blockers:** only actionable, severity-labeled issues.
- **Next:** highest-value milestone toward a sellable TV-market dashboard.
- **Unchanged:** confirm no production merge, deployment, financial trade or Fintech mutation.

**Never fabricate completed steps or evidence.** If a service, repo or SDK is unavailable, implement only what can be substantiated and report the remaining limitation.

## 10. Immediate backlog (first contributor session)

- [ ] Inspect source PR and current NowView contents.
- [ ] Create `docs/MIGRATION_MANIFEST.md` with dashboard-related keep/exclude decisions.
- [ ] Port and rebrand source web and Android dashboard files on a dedicated feature branch, without bot files.
- [ ] Port relevant tests and run CI; label missing SDK or device validations accurately.
- [ ] Record data rights/attribution and production-signing risks.
- [ ] Open one draft PR showing the initial reusable market dashboard in NowView.
- [ ] Do **not** merge or deploy without owner direction.

## 11. Definition of done for first sellable build

A first release is commercially ready only when it is stable on real supported devices, installable and updatable, correctly labeled and reliable with market data, responsive in supported browsers, appropriately licensed and attributed, clear about limitations, and supplied with privacy/terms/support plus an explicitly approved distribution path.

**Focus principle:** *Build the existing dashboard first. Sell value before adding complexity.*
