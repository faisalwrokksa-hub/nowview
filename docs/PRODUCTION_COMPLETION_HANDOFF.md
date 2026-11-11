# NewView — completion and release handoff (2026-11-11)

## Current verified architecture
Four primary dashboards (MyView, Markets, Discover, NewViewDevice), Power BI portal as a MyView shortcut, public Binance Spot tokens and technical charts, official/source-linked news, IPTV source directory, local social bookmarks, encrypted device-layout pairing prototype, and browser-to-browser consent-based WebRTC manual-SDP cast viewer.

## Improvements from the latest batch
- Markets: instrument search/filter for the existing documented Binance Spot list; no invented real U.S. equity prices.
- Floating player: left/right placement for TV remote users in addition to drag, resize, minimize and fullscreen.
- Device-layout syncing: pause while offline and request update immediately on tab reappearance or browser reconnection.
- Navigation: persistent, responsive quick-action rail for Charts, Power BI, Headlines, Social, and Screen Cast.
- Regression tests for each change.

## Must still be completed externally before production
1. **Actual cloud access**: The connected Cloudflare profile can access account `5df066b8dafc1b9794f451fce7d4dc60`, not the previously identified Worker account `d971aa01a0cdd29f016ff88565aded43`. An authorized connection or transfer is required to deploy or create its KV binding.
2. **Identity**: Cloudflare Access RS256 JWT verification is now implemented for the encrypted layout-relay Worker, and it fails closed until the real Access issuer/AUD and protected domain are configured. This is an authenticated protected-beta gate, **not** a complete customer account system. Full customer identity still needs OIDC Authorization Code + PKCE for browser/native, TV device authorization, user tenancy, device revocation, rate limits and account-owned device inventory. A URL-hash bearer pairing link is not account sign-in.
3. **Layout sync hardening**: The current relay now verifies Cloudflare Access JWTs and rejects unauthenticated requests; it also clears link secrets from the URL and asks users to resolve simultaneous local/cloud layout changes. KV still has eventual consistency, last-write-wins and limited revocation. Before public launch add account-owned device claims, atomic conflict resolution (e.g. Durable Objects), quota enforcement, abuse controls, revocation and live device tests. Do not publish the Access-gated prototype as a general customer multi-tenant service.
4. **Actual phone casting**: Implement approved Android MediaProjection foreground-service sender with explicit capture confirmation, authenticated WebRTC signaling, TURN when necessary, reconnect/stop/session timeout, and test on actual Android phones and TVs. Current manual SDP browser demo does not prove Android screen capture.
5. **Power BI integration**: Current portal is a validated official Microsoft Power BI link and local saved report URL. Native report embedding requires the organization's Microsoft Entra tenant consent, licensed Power BI access, delegated/embed tokens, permissions and a supported embedding model; do not ask the user to paste credentials or tokens.
6. **Equity feed**: No licensed U.S. equity quotation provider is connected. Existing Binance-listed tokens must remain explicitly labeled and are not direct underlying-stock prices.
7. **Production release**: Merge reviewed GitHub PR only when accepted, deploy to the correct Cloudflare account, verify live Worker build SHA/health endpoint, configure KV/authn securely, sign Android APK using private signing key, test physical devices/OS permissions, and verify rollback. A Cloudflare preflight workflow explicitly does **not** deploy.
8. **Legal/rights**: Confirm source rights and permissions for broadcast TV streams and proprietary market/data feeds before commercial launch.

## Acceptance evidence to gather
- Full GitHub dashboard build, frontend validation, safety and preflight success for the *same final commit*.
- Browser live test: four tabs, Power BI external link, Markets search, Discover subsections, preserved TV remote focus and persistent cast overlay.
- Cross-device live test: Access login and token rejection, user-device grant/revoke (when implemented), offline/resume, simultaneous edit conflicts, consent denial => no video, active capture => stop works, 30-minute session timeout, and logout termination.
- Device build: signed APK installed on actual hardware, Android background/foreground and TV remote tests.
- Production: live deployment verified against exact approved commit, rollback rehearsal, monitoring with truthful external-provider status.

These are release gates, not evidence that the capabilities have already been activated.

## November 11 security-gap reduction
- Added signature-verified Cloudflare Access JWT gate for the device-layout relay, with exact issuer/audience/expiry validation and fail-closed missing configuration.
- Added request timeouts, secret-fragment cleanup, conflict-choice UI, initial-room initialization gating and stale pairing-session cancellation.
- Added screen-sharing 30-minute expiry and connection-loss cleanup.
- Added negative and positive signed JWT unit coverage with test-generated RSA keys; no committed real secret keys.
- The above are code/CI improvements only. Deployment, customer account identity and physical casting remain open gates.

## November 11 — floating IPTV runtime verification enhancement
The floating IPTV dock now listens to actual HTMLMediaElement playback events. It marks a source healthy only on a `playing` event, identifies a confirmed browser playback error, and treats an unconfirmed 20-second start or autoplay policy failure as **unknown**, not as a proven dead channel. It cancels old timers when changing sources. An automated regression test checks each of these behaviors. This verification is limited to browser media events: HLS format support, DRM, region, provider rights, physical Android playback and signed device installation still need hardware acceptance tests.

### Go / no-go release criteria
- **Code checks:** Latest same-revision GitHub dashboard/Android build, frontend validation, safety checks and Worker preflight must pass.
- **Casting:** Explicit permission, functioning sender/viewer connection on a real pair of devices, controlled termination, and validation of reconnection behavior.
- **Publisher media:** Confirm legal availability and actual playback for representative IPTV/YouTube sources; do not equate playlist membership with success.
- **Production:** Verify deployment under the actual Cloudflare account using live `/version` SHA and `/healthz`, secure Access/KV bindings, and test rollback.
- **Android:** Signed APK installed, remote navigation and native player tested on physical TV hardware.
No automated preflight or source-code score is a substitute for any of these live tests.
