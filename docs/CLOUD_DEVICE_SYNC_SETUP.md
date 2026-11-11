# TheNewView cloud dashboard pairing — first implementation

Status: **feature-branch prototype**, not a production deployment, not an account-authenticated service, and not live screen mirroring.

## What it does

- Browser UI: Settings > **Mirror MyView across devices** > **Create pairing link**.
- Copy the link to a trusted second browser, phone, tablet or compatible TV browser, open the same NewView deployment, and press **Join** if not automatically detected.
- Selected MyView widget IDs/order and the active workspace are encrypted in-browser with AES-GCM and exchanged through same-origin Cloudflare Worker API.
- The Worker stores **ciphertext only** in a KV namespace for seven days from the most recent write. It has no decryption key, which stays in the URL hash and is not part of the HTTP request.
- Connected devices check for changes approximately every 15 seconds while visible. Cloudflare KV is eventually consistent; simultaneous edits can overwrite one another.
- Disconnect stops synchronization locally. It does **not** revoke links or delete the remote copy, and cannot disconnect other linked devices. To stop other devices, create a fresh room and stop using the old link.

## Security and limitations

- Pairing links are **bearer credentials**: anybody with the complete link can read/change the shared layout. Never forward them publicly; use private transfer.
- Sync is **opt in**, and this prototype does not implement account login, user-owned device registration, server-side session revocation, rate limits, or audit trails.
- Cloud storage includes **only** widget IDs and active workspace. It does not send financial CSVs, tokens, credentials, media history, or screen/audio/video.
- The pairing link has a cryptographically random 256-bit room identifier and a separate random 256-bit AES key, generated with Web Crypto.
- All requests remain on the same-origin Worker host; cross-origin PUT attempts are rejected. HTTPS is required for Web Crypto and clipboard convenience.
- Cloudflare KV has eventual consistency and last-write-wins behavior. This is layout *sync*, not a pixel-perfect phone screen stream or remote control.
- Do not enable for public customer use before proper identity, auth/rate limits, device revocation, integration tests, and security review.

## Cloudflare setup (operator required)

1. Ensure the Cloudflare account containing Worker `nowview` is accessible to the deployment identity.
2. In the repo's deployment environment, create a Workers KV namespace via Wrangler, e.g. `npx wrangler kv namespace create NEWVIEW_SYNC`. Record the namespace ID.
3. Add this binding to `wrangler.json` next to the existing fields, substituting the **actual** created ID:

```json
"kv_namespaces": [
  { "binding": "NEWVIEW_SYNC", "id": "YOUR_ACTUAL_NAMESPACE_ID" }
]
```

4. First deploy to a protected staging Worker with rate limits and auth controls. Run `npm run verify`, run endpoint tests, and verify real phone/TV browser behavior. Do not let a successful preflight imply live deployment.
5. If account authorization and staging tests pass, merge the reviewed PR and deploy using the existing approved GitHub workflow. Verify `/version` matches approved SHA and `/healthz` is reachable. Keep automatic credential-free pairing disabled or behind restricted access in any public production environment until the commercial identity model is complete.

Without a KV binding, `/api/device-sync/<room>` responds with **503**, leaving existing dashboards functional.

## Integration with uploaded `phone-main.zip`

The ZIP contains an MIT-licensed Android Rescue AI project, including experimental WebRTC/video capture and Android app source. It is **not** a verified build and must not be treated as an already working cross-device mirroring SDK. For full screen/audio mirroring:

1. Do a license/manifest/network/privacy audit and hardware builds of that source separately.
2. Use Android MediaProjection on the sending device with explicit user confirmation and a persistent foreground notification; use browser `getDisplayMedia` only following a user gesture on supported desktop browsers.
3. Use consent-based WebRTC and an authenticated signaling channel, explicit viewer approval, Stop sharing and expiration, without covert capture or remote controls.
4. Authenticate devices using OIDC Authorization Code + PKCE and short-lived tokens. An unlogged pairing link is not equivalent to a signed-in account.
5. Keep production APK signing and release gates separate. The Windows App Installer extract is packaging metadata, not a screen-mirroring implementation.

## Files
- `web/device-sync.js`: local UI, Web Crypto, opt-in pairing and polling.
- `cloud/device-sync.mjs`: Cloudflare KV encrypted relay and strict request checks.
- `cloud/build.mjs`: bundles sync handler and UI into Worker.
- `tests/device-sync.test.mjs`: relay, validation, expiry, and feature-boundary tests.


## Security update — Cloudflare Access verification (development branch)

The relay now **fails closed** until BOTH a Workers KV namespace and a Cloudflare Access application are configured for the same protected NewView host.

Required Worker environment variables:

- `NEWVIEW_SYNC_ACCESS_ISSUER`: exact Access team issuer, e.g. `https://YOUR-TEAM.cloudflareaccess.com`; it must be an HTTPS `*.cloudflareaccess.com` origin.
- `NEWVIEW_SYNC_ACCESS_AUD`: the actual Access application's Audience Tag (AUD), not a placeholder.
- `NEWVIEW_SYNC`: Workers KV namespace binding.

Steps for the Cloudflare account owner:

1. Protect the NewView hostname and its `/api/device-sync/*` requests with a Cloudflare Access self-hosted application and appropriate identity policies. Include preview/workers.dev hostnames in protection or disable any public bypass host.
2. Configure the real Access issuer and AUD as Worker environment variables. Do not commit live credentials, signing keys, or identity data into source control.
3. Create and bind a KV namespace with name `NEWVIEW_SYNC`. Test only on protected staging first.
4. Request a sync endpoint without an Access session: it must return HTTP 401 (or an Access login challenge before reaching the Worker). With missing configuration, it must return 503. Forged and expired tokens must fail.
5. After signing in through Access, open NewViewDevice, create a link and pair a second signed-in device. Test deliberate edits, conflicts, offline resume and stale room rejection.
6. Set Access policies for the intended authorized users. Browser pairing links remain secret bearer capabilities, NOT substitutes for account sign-in.

The Worker cryptographically validates the Cloudflare Access JWT RS256 signature using the issuer's JWK endpoint, and checks issuer, audience, expiry, not-before and subject. It does not trust the mere presence of `Cf-Access-Jwt-Assertion`. Cert keys are cached briefly per isolate; validation failures are handled without exposing tokens.

**Important deployment constraints:** Cloudflare Access secures a protected beta, but it does NOT implement customer-owned devices, device revocation, billing, tenant isolation, TURN signaling, or a signed native Android app. Cloudflare Workers KV remains eventually consistent and does not offer atomic multi-device conflict resolution. The UI detects competing edits and requests the user to choose, but true concurrency-safe writes require a Durable Object or transactional backend.

Privacy improvements: an incoming pairing URL fragment is removed from the address bar immediately after parsing; secret links cannot be copied before room initialization. The relay uses a 10-second request timeout and stops stale disconnected-tab sync operations. Screen sharing is separate and automatically terminates after a 30-minute session or prolonged connection loss.

For Cloudflare Access JWT documentation, see https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ .
