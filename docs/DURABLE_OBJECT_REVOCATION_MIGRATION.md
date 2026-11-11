# NewView device-sync revocation — SQLite Durable Object migration

**Status:** Implemented on draft PR #110. CI-validating code; **not deployed** to production.

**Production target provided by the project owner:** Cloudflare account `d971aa01a0cdd29f016ff88565aded43`, Worker service `nowview`, environment `production`.
The connected Cloudflare API currently lists only account `5df066b8dafc1b9794f451fce7d4dc60`. Do not deploy to that different account. The correct account must be authorized before performing a deployment.

## Change

The authenticated `/api/device-sync/:room` endpoint no longer reads or writes `NEWVIEW_SYNC` KV. It requires `NEWVIEW_SYNC_ROOMS`, a SQLite-backed Durable Object namespace declared in `wrangler.json`.

Every (verified Cloudflare Access subject, cryptographically random room ID) pair maps to one Durable Object, under a SHA-256 partition key rather than storing the raw subject or room ID. It holds a single row:

- `blob`: the existing encrypted AES-GCM layout payload (never plaintext to the Worker)
- `expires_at`: room expiry
- `revoked`: permanent tombstone

Reads, creates, updates and revocations execute on the same Durable Object. The relevant SQLite operations have no external I/O or `await` between the state check and write, so a committed revocation prevents any subsequent read, update or recreation of that room.

## API and client behavior

| Method | Behavior |
| --- | --- |
| GET | Read an existing non-revoked, non-expired encrypted room |
| POST | Explicitly create a new room; rejects a live room |
| PUT | Update an existing room only |
| DELETE | Permanently revoke a room and discard its ciphertext |

The client now uses POST only on an intentional *Create pairing link* flow. A device joining an unknown or expired link cannot recreate the room accidentally. Revoked rooms always return 410. Missing bindings or an unreachable Durable Object return 503 instead of falling back to stale KV data. All four methods remain behind verified Cloudflare Access JWT claims and exact-origin mutation checks.

## Required production migration

1. Obtain Cloudflare access for account `d971aa01a0cdd29f016ff88565aded43` and confirm the existing `nowview` Worker, routes, Access policy and secrets.
2. Review `wrangler.json` binding `NEWVIEW_SYNC_ROOMS`, class `NewViewSyncRoom`, and its `new_sqlite_classes` migration. Deploy only to the approved account, not the currently accessible other account.
3. Keep `NEWVIEW_SYNC_ACCESS_ISSUER` and `NEWVIEW_SYNC_ACCESS_AUD` intact and configure Access protection on the public domain. The existing `NEWVIEW_SYNC` KV namespace can remain unmodified for rollback research, but must **never** become a fallback used for security decisions.
4. **Invalidate/re-pair all existing KV rooms.** Their prior state is intentionally not imported because KV tombstones may be stale. Tell users to create fresh links. Do not silently migrate previously revoked rooms.
5. Verify a live room's create/update/read/revoke actions, including another Access user's inability to read it; verify GET/PUT/POST all return 410 after revocation. Verify the same behavior after Durable Object eviction and cross-region access before customer rollout.
6. Check operational budget and retained tombstones; a permanently revoked random room ID remains a retained Durable Object record. For future retention policy, implement a safe identity/capability rotation model—never delete tombstones while any previously shared link can be accepted.

**Limitation:** This secures encrypted *dashboard-layout sync rooms*. It does not yet implement device-specific OAuth identity, sign-out token revocation across all services, casting-session revocation, or a customer device inventory. Customer-wide revocation remains a separate goal.
