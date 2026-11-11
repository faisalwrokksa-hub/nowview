# NewView bulk development handoff — 2026-11-11

This handoff records **code changes committed to draft PR #110**. No production deployment, native device test, or signing operation was performed. The existing workflows may validate changes automatically on GitHub; those results are separate from field acceptance.

## 1. Cloudflare account/device-sync hardening

A Cloudflare Access-authenticated device-layout room now supports `DELETE /api/device-sync/:room` to revoke the room. A same-lifetime KV tombstone rejects later `GET`, `PUT` and `DELETE` requests for the old room ID with HTTP 410; the UI offers **Revoke pairing for all devices** and disconnects when notified of revocation. This deliberately does **not** claim to be a customer device registry, per-device sign-in, or atomic consistency. Cloudflare KV may be eventually consistent across regions, so a full commercial device-revocation guarantee requires a strongly consistent coordinator such as Durable Objects and account-owned device identity.

The capability remains scoped to a verified Cloudflare Access principal. Users should protect links containing encryption keys, though a link by itself does not grant access to a different Access account. Users can still disconnect just the current device without revoking a room.

**Cloudflare requirements**: the correct account, `NEWVIEW_SYNC` KV binding, `NEWVIEW_SYNC_ACCESS_ISSUER`, `NEWVIEW_SYNC_ACCESS_AUD`, and protected domain configured. See prior handoff for actual account mismatch. Do not invent a namespace ID or copy credentials into the repository.

## 2. Verified production deployment safeguards

The main-only frontend publish workflow optionally runs a read-only public smoke check after an authorized Cloudflare deploy:

- `NEWVIEW_PRODUCTION_URL` (GitHub repository variable): exact public `https://*.workers.dev` URL required by the smoke tool. The tool will reject arbitrary other hosts.
- `NEWVIEW_ENFORCE_RELEASE_GATE=true` (GitHub repository variable): fail the main release if that URL is missing.
- `NEWVIEW_REQUIRE_SOURCE_HEALTH=1` (GitHub repository variable): require valid fresh `/api/source-health` output in the post-deploy gate.
- `FRONTEND_DEPLOY_VIA_GITHUB=true` enables the existing main-only publishing workflow; `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` remain GitHub Actions secrets.

The smoke gate checks that `/version` serves the exact expected 40-character release commit and, if configured, that scheduled source-health data is fresh. The build dry-run alone is not evidence the public service was updated.

These variables require review: if the public domain uses a custom hostname, the existing smoke tool must be extended through an explicit allowlist rather than accepting arbitrary URLs.

## 3. Manual release signing for two Android applications

`.github/workflows/signed-android-release.yml` exposes a manually dispatched, **main-only** GitHub Actions build under the approval-protected `newview-android-release` environment. It packages the existing NewView TV app and the separate native Phone Caster app, signs both with the supplied private keystore, verifies APK signatures, and publishes an internal artifact containing both signed APKs plus SHA-256 checksums.

Set these four secrets in the approval-protected environment (not in git):

- `NEWVIEW_SIGNING_KEYSTORE_BASE64` — base64 representation of the approved signing keystore.
- `NEWVIEW_SIGNING_STORE_PASSWORD`.
- `NEWVIEW_SIGNING_KEY_ALIAS`.
- `NEWVIEW_SIGNING_KEY_PASSWORD`.

The workflow does not upload to Play Store, change live releases or download a signing key. Running it requires an authorized human and secrets. A successfully signed package still needs real Android installation, upgrade and playback acceptance before customer distribution.

## 4. Not closed by this coding-only batch

- Native Phone Caster and TV have not been verified streaming to one another on physical hardware.
- Casting still uses manually transferred WebRTC SDP codes. Automatic authenticated QR/relay signaling requires an authorized phone identity flow, reliable signaling infrastructure and potentially TURN. It must not be implemented with an unauthenticated public code exchange.
- A real Cloudflare production account with the correct KV bindings and scheduled worker is still required.
- Licensed stock/Power BI data, approved YouTube channel discovery, per-device account inventory, and hardware QA remain external or separate integration tasks.
- Broadcast content rights and source reachability cannot be inferred from a playlist URL.

This batch intentionally avoided manual tests, as requested; code changes must not be represented as a verified 10/10 live release.
