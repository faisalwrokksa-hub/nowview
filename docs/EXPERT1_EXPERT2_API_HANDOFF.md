# NewView Expert 1 ↔ Expert 2 API integration — working contract

## Verified starting point
The owner-provided backend starter (`newview-cloud-starter.zip`) contains a Node prototype with currently implemented **GET `/v1/health`**, **GET `/v1/catalog`** and **GET `/v1/catalog/categories`**. These are local prototype endpoints, **not deployed services**. The proposed `newview-cloud` repository was not found in connected GitHub at audit time.

**Resolve version-prefix mismatch:** Previously filed issue #2 used a preliminary `/api/v1` proposal. The uploaded backend starter and shared integration contract use **`/v1`**. Treat **`/v1` as current handoff baseline** pending explicit joint schema review, and do not silently serve two incompatible contracts.

## Frontend integration map
| Feature | Backend `/v1` API | State | Frontend behavior |
|---|---|---|---|
| Health | GET `/v1/health` | Prototype | Non-blocking status and offline state |
| Tool catalog | GET `/v1/catalog` | Prototype | Read-only cards with stable IDs |
| Categories | GET `/v1/catalog/categories` | Prototype | Filter and navigation |
| Account | GET `/v1/users/me` | Planned | Mock profile or signed-out state |
| Entitlements | GET `/v1/entitlements` | Planned | Display availability only; no client authority |
| Preferences | GET/PUT `/v1/preferences` | Planned | Device-local fallback; versioned sync |
| Workspaces | GET/PUT `/v1/workspaces` | Planned | Local layout preserved until sync |
| Devices | POST `/v1/devices` | Planned | Register only after authentication |
| Subscriptions | `/v1/subscriptions` | Planned | No paid state without server response |

## Client safety rules
- HTTP base URL is environment/config controlled; do not hardcode production secrets.
- Timeouts, request cancellation and bounded retry. Only retry safe/idempotent requests by default.
- No fabricated paid entitlement and no checkout from native code; use backend-hosted checkout flows.
- Keep free/offline dashboard functions usable during backend outages.
- For Android identity, prefer system-browser OAuth authorization-code + PKCE when E1 supports it; do not route credentials through untrusted WebViews.
- No privileged Android JS bridge in THE EPMO portal or untrusted article views.
- Distinguish device-only from cloud-synchronized settings and define sync conflict handling before enabling writes.
- Contract tests should include anonymous user, 401, 403, 429, offline, expired session, revoked entitlement and cross-device preference conflict.

## Ownership
Expert 1 exclusively owns server identity, billing, customer records, entitlements and sync authority. Expert 2 exclusively owns Android/dashboard clients, layouts, player, browser and device QA. Never edit Expert 1's repository from this branch.

## Release gating
Do not merge, publish APK, change Cloudflare, enable billing or claim device compatibility without separate owner authorization and QA evidence.
