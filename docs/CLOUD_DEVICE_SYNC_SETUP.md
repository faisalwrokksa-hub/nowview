# NewView — Authenticated device sync operations (current)

> Current implementation contract. This supersedes the earlier experimental KV, unprotected pairing, and last-write-wins instructions. Do not deploy the legacy `NEWVIEW_SYNC` KV configuration described in earlier handovers.

## Current source of truth

- `cloud/device-sync.mjs` requires `NEWVIEW_SYNC_ROOMS`, a Durable Object namespace, and verified Cloudflare Access identity. Without either requirement, the endpoint fails closed (503); without valid Access credentials, it returns 401.
- `cloud/sync-room.mjs` stores only AES-GCM ciphertext and an expiration in a per-principal, per-room SQLite-backed Durable Object. It stores no decryption key. The encrypted room identifier is partitioned using a SHA-256 hash of the verified Access subject and random room ID.
- `web/device-sync.js` uses an opt-in client-side AES-GCM pairing key held in the fragment of a shared link. The fragment is not included in HTTP requests, but the *complete link* still grants a capability to its holder within the **same authenticated identity**. Never publish it.
- The room expires seven days after creation or last successful update; all writes use an expected encrypted value to reject concurrent overwrites with HTTP 409. DELETE sets a permanent revocation tombstone; an expired/revoked link is not silently re-created.
- Browser-to-browser sharing transfers validated widget layout/workspace state. Optional viewing preferences/history require separate consent. This is **not** screen casting, remote control, or account/device enrollment.

## Required operator-owned configuration

1. Identify the actual Cloudflare account and protect the intended hostname and `/api/device-sync/*` with a Cloudflare Access application. Review every alternate hostname and workers.dev route for potential bypasses.
2. Configure real `NEWVIEW_SYNC_ACCESS_ISSUER` and `NEWVIEW_SYNC_ACCESS_AUD` values for the protected Access application. Never commit live credentials or placeholder values.
3. Create and bind the `NEWVIEW_SYNC_ROOMS` SQLite Durable Object using the existing migration/configuration in the repository. Do **not** replace this with Workers KV.
4. Validate 503 without binding/configuration, 401 for missing/invalid Access credentials, user-scoped room isolation, 409 for stale writes, 410 after revocation, 404 after expiry, and successful refresh after reconnect.
5. Verify pairing and revocation on actual devices only in the final acceptance stage. In the meantime, never claim live multi-device sync was validated merely because CI passed.

## Threat model and release safeguards

- **Pairing capability exposure:** complete hash-fragment links must be transferred privately. Do not log them, put them into analytics, paste them into tickets, or expose them to untrusted scripts.
- **Identity isolation:** a valid room ID under another Access subject resolves to a different Durable Object. Validate Access issuer/audience and signature before any room operation; fail closed if the Access configuration or DO binding is unavailable.
- **Conflicting edits:** compare expected ciphertext before writing; require user confirmation/reload after HTTP 409 rather than silently overwriting newer data.
- **Revocation and expiry:** revocation is permanent for that room ID, and encrypted data is cleared; pairing creates a new random room. Disconnection on one client alone does not revoke the room.
- **WebView and untrusted sites:** publisher pages use an isolated browser and must never receive privileged local device bridges. Review native Android permissions and deep links in the final security acceptance.
- **Privacy:** do not include credentials, CSV contents, private browsing history, tokens, or pairing secrets in sync payloads or support tickets. Consent for optional viewing data must remain off by default.

## Verification

Run the repository's `npm run verify` CI pipeline and `tests/device-sync.test.mjs`, `tests/device-security.test.mjs`, and `tests/device-sync-client-race.test.mjs`. Final sign-off also requires an authenticated, real-device pairing/revoke/conflict session and explicit owner approval. Tests are evidence of code behavior, not Cloudflare account configuration.
