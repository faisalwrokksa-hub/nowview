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
2. **Identity**: OIDC Authorization Code + PKCE for browser/native and device authorization for TV. Bind sessions to a user with server-side tenancy, revocation, rate limits, and an account-owned devices inventory. A URL-hash bearer pairing link is *not* user sign-in.
3. **Layout sync hardening**: KV has eventual consistency, last-write-wins and limited revocation. Add authenticated device claims, optimistic concurrency/conflict resolution, quota enforcement, abuse controls and integration tests. Do not publish the current unauthenticated KV relay as a general customer-facing feature.
4. **Actual phone casting**: Implement approved Android MediaProjection foreground-service sender with explicit capture confirmation, authenticated WebRTC signaling, TURN when necessary, reconnect/stop/session timeout, and test on actual Android phones and TVs. Current manual SDP browser demo does not prove Android screen capture.
5. **Power BI integration**: Current portal is a validated official Microsoft Power BI link and local saved report URL. Native report embedding requires the organization's Microsoft Entra tenant consent, licensed Power BI access, delegated/embed tokens, permissions and a supported embedding model; do not ask the user to paste credentials or tokens.
6. **Equity feed**: No licensed U.S. equity quotation provider is connected. Existing Binance-listed tokens must remain explicitly labeled and are not direct underlying-stock prices.
7. **Production release**: Merge reviewed GitHub PR only when accepted, deploy to the correct Cloudflare account, verify live Worker build SHA/health endpoint, configure KV/authn securely, sign Android APK using private signing key, test physical devices/OS permissions, and verify rollback. A Cloudflare preflight workflow explicitly does **not** deploy.
8. **Legal/rights**: Confirm source rights and permissions for broadcast TV streams and proprietary market/data feeds before commercial launch.

## Acceptance evidence to gather
- Full GitHub dashboard build, frontend validation, safety and preflight success for the *same final commit*.
- Browser live test: four tabs, Power BI external link, Markets search, Discover subsections, preserved TV remote focus and persistent cast overlay.
- Cross-device live test: auth grant/revoke; correct conflict handling, offline/resume; permission denied => no video; active capture => stop works; session termination on logout.
- Device build: signed APK installed on actual hardware, Android background/foreground and TV remote tests.
- Production: live deployment verified against exact approved commit, rollback rehearsal, monitoring with truthful external-provider status.

These are release gates, not evidence that the capabilities have already been activated.
