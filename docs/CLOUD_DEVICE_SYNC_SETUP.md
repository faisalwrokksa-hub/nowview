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
