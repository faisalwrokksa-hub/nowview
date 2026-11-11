# TheNewView — authenticated multi-device dashboard and mirroring design

Status: proposal and integration gate; **not implemented or deployed**.
Reference: requested companion repository `faisalwrokksa-hub/phone` (not accessible to connected GitHub account as of 2026-11-11; returns 404). Do not claim a merge until access and review are complete.

## Goals
- One signed-in user can resume MyView, Markets, Business, Watch & News, and Social on authorized phone, tablet, browser, and Android TV clients.
- Sync settings and layouts, not device-specific secrets or copyrighted media.
- Optional live screen-sharing sessions are user-initiated, short-lived, and visible to all participants.
- Work offline with local preferences; reconcile edits on reconnect.

## Architecture
1. **Existing client**: keep `web/` frontend and the Android TV package identity unchanged.
2. **Companion client**: inspect the phone repository's platform, license, dependencies, architecture, UI and signing setup before integrating. Prefer a separate app with shared API schema; do not copy code blindly or rename existing packages.
3. **Identity**: OIDC Authorization Code + PKCE through an approved identity provider; never embed client secrets in apps, use device authorization where TV login input is limited. Use short-lived access tokens, rotating refresh tokens, revocation, rate limits, secure cookie settings for web, OS secure storage for native clients. Do not require a paid email service.
4. **Data**: per-user encrypted server-side profile settings and widget list; tenant/user separation enforced on every read/write. Store credentials and private business CSVs locally by default unless separately and explicitly opted in. No silent upload of browsing/media history.
5. **Sync**: scoped API `GET /api/me/layout`, `PUT /api/me/layout` with schema validation, ETag/version precondition, size limits, per-user access control and conflict handling; sync only allowlisted settings.
6. **Device pairing**: short-lived, one-use pairing code and approval on an existing logged-in device; show device name, OS, last active, and revoke action. Never share login tokens in QR payloads.
7. **Presence**: optional authenticated WebSocket or SSE for config changes. Push only a change/version notification, then re-fetch state securely. Apply backoff on reconnect and conservative heartbeat intervals.
8. **Live mirroring** (distinct from dashboard sync): use browser screen capture with an explicit user gesture and OS permission, or platform screen capture APIs where supported; WebRTC transport with ephemeral session offers, consent on both sides, secure signaling, and a persistent “Sharing” indicator plus Stop button. TURN/STUN chosen only after network/cost review. No stealth capture, unattended remote control, recording or persistence by default.
9. **Security**: HTTPS-only, strict origin/CORS controls, CSP, CSRF protection, session isolation, audit of device grants/revocations, deletion/export tools, no plaintext tokens in localStorage or logs. Monitor authentication failures and enforce quotas.
10. **Deployment**: stage feature behind a feature flag; separate staging environment and versioned migrations; measure rollback and failure recovery. Do not infer deploy success from CI preflight alone.

## Proposed safe phases
- **A: Phone repo due diligence** — obtain GitHub app access; audit manifests, build pipeline, licenses, network endpoints, credentials, and app signing; compare with `nowview`; document file-level merge plan.
- **B: Authenticated sync MVP** — sign-in/out, self-service devices, one-way import of existing local preferences (opt-in), multi-device layout sync, conflict recovery, tests.
- **C: Mirroring MVP** — opt-in screen sharing between two authorized devices; explicit start/stop, session expiry, device compatibility tests.
- **D: Commercial readiness** — hardware QA across Android phone/TV and browser, accessibility, localization, security review, signed native releases, live deployment verification.

## Merge and test gates
- Do not merge `phone` into `main` until both repositories are readable, licensing and package identities are reviewed, and exact integration boundaries are agreed.
- CI: schema validation; authn/authz, cross-account isolation, expired pairing code, revocation, conflict/ETag, reconnect/offline, capture consent/stop, accessibility, and Android package signing tests.
- User acceptance: paired device syncs edits correctly; logout revokes session; denied screen permission shares nothing; reconnection recovers without exposing data; TV can be paired without typing credentials.
- No phone or Windows app binary should be executed just to infer its functionality; inspect statically first.

## Existing constraints
- NewView development changes currently live on a draft PR/feature branch, not production.
- The Cloudflare Workers account previously returned 403 through the connected app; production deployment must be verified independently.
- `phone` repository does not currently resolve through the GitHub connection (404). This is a blocker to code merge, not evidence that it does not exist.
