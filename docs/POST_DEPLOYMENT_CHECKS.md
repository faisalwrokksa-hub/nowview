# NewView — Live deployment acceptance and expert worklist

## Verified baseline
NewView staging Worker: https://nowview.faisalwrokksa.workers.dev/
Cloudflare project: `nowview`; source branch: `feat/expert2-apk-audit-20261109`.
The existing website has five workspaces: MyView, Markets, Business, Watch & News, Social. Do not conflate an HTTP 200 with tested device compatibility or a commercial release.

## Phase A — reproducible health and smoke checks
New `GET /healthz` returns:
```json
{"status":"ok","app":"newview","scope":"worker-only","upstreamsChecked":false}
```
It verifies the Worker is responding, **not** whether Binance, news publishers or other third-party systems are available. `POST /healthz` must return 405.

After the Cloudflare deployment indicates **Ready**, run:
```bash
npm run smoke:public
# Optional diagnostics; third-party failures are logged separately, never fabricated as successful.
NEWVIEW_CHECK_UPSTREAMS=1 npm run smoke:public
```
The smoke checker tests HTTPS and safe `workers.dev` URL validation, homepage and essential JS routes, Worker health JSON, invalid market-input rejection, and missing-resource behavior. It does not mutate the application. It deliberately fails on a stale deployed version that lacks `/healthz`. Do **not** mark a failed stale-version test as a code regression; verify deployment commit first.

Run `npm test`, the GitHub dashboard workflow, F1 safety workflow and Wrangler `deploy --dry-run`. Automated checks use only public test data; no account credentials.

## Security and resilience
- Worker rejects unknown RSS source IDs with HTTP 400 and unknown market symbols/ranges with HTTP 400 before contacting third parties.
- Basic public response headers include `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options`.
- Public JSON errors do not expose server stack traces.
- RSS parser limits response size, origin and redirects; market API validates symbol identity and cooldown.
- Browser online/offline indicator does *not* imply that Binance/news endpoints are healthy.

## Phase B — customer-visible gaps to prioritize
1. **Markets**: keep Binance Spot token instruments clearly separated from underlying U.S. equities. U.S. stock quotes are explicitly unavailable until an authorized provider is connected. Add transparent per-feed timestamps and stale/error states rather than placeholders that resemble real prices.
2. **Watch & News**: audit playlists for lawful playback, browser codec/CORS support, player focus, recoverable errors, and fallback to the official broadcaster. No claim that all public IPTV playlists play inside the browser.
3. **Business**: the CSV dashboard is local-only and intentionally does not send company data to a backend. Add real customer data integration *only* once NewView Cloud v3.9 authentication and permissions are verified.
4. **Social**: this is a curated public-link/bookmark tool; no live X/TikTok/Meta aggregated feeds currently exist. Use documented, authorized APIs rather than scraping.
5. **MyView and Android TV**: persist layout profiles, verify D-pad focus and wallpaper behavior with an actual device/emulator; native app discovery requires the Android bridge.
6. **Internationalization**: inventory literals and define localized strings with RTL layout checks; do not ship machine-translated copy as if reviewed.

## Release gates and rollback
The active Cloudflare `nowview` service is still labelled Production in the provider UI even when serving the staging website. Avoid touching the main branch, THE EPMO systems, DNS, billing or customer data without explicit consent.

For any new deployment:
- Confirm Cloudflare active build SHA exactly matches the reviewed GitHub commit.
- Verify `/healthz` then all smoke routes, API error handling, five workspaces, desktop and mobile interactions.
- Capture Cloudflare deployment version ID and logs.
- If smoke checks regress, use Cloudflare deployment history to roll back to the last known working version; never claim rollback without verifying traffic allocation.
- APK alignment, signed APK integrity, Android TV device tests, authentication, device sync and entitlements require independent verification.

## Current change scope
The above Worker health and public smoke-check improvements are staged in Draft PR #3. CI successes only establish build/test status; the Cloudflare active revision must be checked separately.
