# NewView — Deep technical audit (12 November 2026)

**Scope:** GitHub `faisalwrokksa-hub/nowview`, Android TV + Phone Caster test APK, web/Cloudflare Worker, IPTV, browser/YouTube, device sync, and release evidence.
**Audited baseline:** `a4c39f93568bfc90e5cc6a181266a20d1fcaf822` on `main`.
**Evidence distinction:** This is a code/workflow and test-artifact audit; **not** a physical Android TV or live endpoint acceptance report. Production release remains **NO-GO**.

## Confirmed facts

- Latest merged PR #178 contained the browser handoff change. PR-head `6e402b284bc825b902ad1e49a3ac452808ac2139` passed CI, TV/web build, source safety checks and two-APK generation. The Android emulator and read-only integration preview workflows were marked **SKIPPED** in that result; skipped is not passed acceptance.
- The test APK ZIP records PR-head SHA `6e402b2...`, **not** merged main SHA `a4c39f9...`. This provenance gap is inherent when the two-APK workflow is triggered by PR, but not by main pushes.
- GitHub `frontend-auto-publish.yml` does validation; its production deployment step is gated on manual dispatch, variable `FRONTEND_DEPLOY_VIA_GITHUB=true`, and `deploy=true`. The intended automatic publisher is Cloudflare Workers Builds, which cannot be confirmed from GitHub build success.
- `cloud/build.mjs` correctly uses Cloudflare's documented `WORKERS_CI_COMMIT_SHA` fallback to `GITHUB_SHA` for `/version` revision, if present; the live endpoint response was **NOT VERIFIED**.
- Web YouTube full homepage is deliberately **not** embedded: known publisher frame policy; Android uses an isolated native WebView. Per-video YouTube player is an official embed, dependent on platform permissions.
- `web/cast-overlay.js` uses manual WebRTC SDP exchange with LAN-only ICE; the native phone sender is a separate app. Automatic casting/device discovery is **not implemented by this existing code path**.
- `web/device-sync.js` is unavailable inside the file:// Android TV app, requires an HTTPS host and Cloudflare Access identity; the backend uses encrypted room payloads in a Durable Object. This is NOT native Android-to-Android layout sync.
- Test build signing is temporary development signing and is unsuitable for verified in-place customer updates.

## Findings and remediation

| ID | Severity | Finding | Remediation | Evidence |
| --- | --- | --- | --- | --- |
| NV-A01 | P0 | Post-merge Android APK download is not guaranteed to correspond to exact merged `main` SHA | Add `push: main` trigger for APK bundle with path filters; existing SHA/asserted checksum safeguards remain | `.github/workflows/complete-apk-bundle.yml` |
| NV-A02 | P0 | No independently verified Worker `/version` matching merged `main` | Add read-only, bounded post-main GitHub Action checking version before existing public smoke check; never deploy from verification job | `cloud/build.mjs`, `tools/smoke-public-newview.mjs` |
| NV-A03 | P0 | 12 real-TV and 8 manual-browser acceptance scenarios lack genuine observed evidence | Execute test matrix on physical devices, record package hash, result and human reviewer | `docs/RELEASE_ACCEPTANCE_MATRIX.md` |
| NV-A04 | P1 | Android TV native sync does not use web's HTTPS/AES-GCM room UI on file:// | Implement authenticated native pairing UX and room operations after security threat review; do not auto-enable insecure unauthenticated relay | `web/device-sync.js`, `cloud/device-sync.mjs` |
| NV-A05 | P1 | Phone casting requires manual offer/answer and same reachable LAN | Test both receiver and sender and SDP lifecycle on actual devices; implement consented discovery/signaling only with explicit auth, replay protection and policy | `web/cast-overlay.js` |
| NV-A06 | P1 | Browser IPTV support depends on broadcaster formats, CORS/DRM/codec | Test rights-cleared channels on actual Android TV, validate recovery, reconnect, long-running playback | `web/media.js` |
| NV-A07 | P1 | Full third-party websites, including YouTube homepage, cannot reliably load in an iframe | Retain real top-level publisher link on web and isolated native browser on Android; do not promise full website iframe | `web/internal-browser.js`, `web/youtube-viewer.js` |
| NV-A08 | P1 | Source rights registry has seven entries unverified | Human legal/source review with specific evidence per use; keep commercial checkout off | `config/commercial-source-rights.json` |
| NV-A09 | P1 | APK production signing, certificate continuity, upgrade/rollback unverified | Owner-held signing and physical upgrade tests; do not reuse CI keys | `docs/ANDROID_RELEASE_POLICY.md` |
| NV-A10 | P1 | `main` protection not independently configured | Configure enforceable GitHub ruleset in repository Settings; verify required checks and PR reviews | Repository settings |
| NV-A11 | P2 | Prior ratings of 9+/10 reflected automated quality rather than observed device performance | Present estimated code maturity separately from measured operational readiness | Release acceptance matrix |

## Changes introduced by this audit

1. **Correct APK provenance:** generate development-only TV and Phone Caster test bundles on relevant merges to `main`; retain PR bundle preview and measured git source checks.
2. **Read-only live revision gate:** `.github/workflows/verify-live-worker.yml` waits up to 18 attempts for the exact merged SHA, then runs `tools/smoke-public-newview.mjs`. A missing, stale or unreachable Cloudflare Worker fails the workflow and must not be reported as a successful deployment.
3. **Regression tests:** `tests/release-provenance-workflows.test.mjs` guards both new workflows.

These actions improve **verifiability**, not broadcaster licensing, hardware performance, native discovery, or commercial permissions.

## Release gate

- Automated jobs passing is a development signal, not proof of IPTV reliability or Android TV remote focus.
- Keep payment checkout, paid entitlements and owner signing **disabled**.
- Require an independently matching `/version` SHA, exact-`main` APK bundle, verified Android signing policy, and the 20 hardware/browser scenarios before claiming fully operational 10/10.
- Do not delete GitHub branches or old artifacts until references, releases and rollback dependencies are checked.

## Acceptance targets for next on-device session

- Play rights-cleared live HLS and native player sources for at least 30 minutes each; explicitly record freezes, codec, buffering and retry.
- Cast phone screen to Android TV while switching networks, pausing/resuming and revoking; measure connection success and errors; do not treat manual SDP proof as automatic pairing.
- Verify Back, Home, Select, D-pad and focus in TV launcher, browser, playback, settings, dialogs and full-screen.
- Verify full-site YouTube opens in native Android WebView, and web fallback opens top-level YouTube rather than blank iframe; expect publisher restrictions where enforced.
- Verify two authorized browsers synchronize layouts and revoke access, then separately test native APK integration once implemented.
