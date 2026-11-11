# NewView — Cloudflare scheduled source-health monitoring

## Code implementation
The Worker includes a `scheduled(event, env, ctx)` handler and Wrangler Cron `*/2 * * * *`. Every two minutes, it checks **only** the six allowlisted public RSS sources through the same bounded XML parser used by the public news endpoint. An IPTV-org master-directory reachability check runs no more frequently than once every three hours using a 16 KiB maximum read budget. No arbitrary user-supplied URL is fetched, and individual IPTV playback is **not** claimed to work based on a directory check.

Snapshots are stored in the optional Cloudflare KV binding **`NEWVIEW_SOURCE_HEALTH`** with a seven-day expiration. The read-only `GET /api/source-health` endpoint publishes coarse source status and checked timestamps; it returns **HTTP 503**, not simulated data, when KV is absent or no valid snapshot exists.

MyView displays a verified Cloudflare status only if the snapshot is sufficiently recent. It continues its existing local checks while NewView is open; the server checks depend on the configured Cron trigger and deployed Worker, not the web page being open.

## Deployment requirements (not performed from this development branch)
1. Use the **correct production Cloudflare account**. Confirm the project's Worker or Pages advanced-mode deployment supports Cron triggers. If the site is hosted only on Pages without independent scheduled Workers, deploy the scheduled handler as a separate Worker in the same account.
2. Create a new Cloudflare KV namespace for **`NEWVIEW_SOURCE_HEALTH`**. Bind it to the Worker using its actual namespace ID; do **not** substitute `NEWVIEW_SYNC` or commit a placeholder ID. This repository intentionally does not invent an account-specific binding.
3. Deploy the correct revision after review, and configure the actual Cron schedule `*/2 * * * *`. Verify the real binding and schedule in Cloudflare's dashboard. No scheduling occurs from GitHub CI alone.
4. Run the scheduled handler using a Cloudflare scheduled-event test, then verify `GET /api/source-health` produces a timestamped snapshot with exactly the approved feed identifiers and an IPTV status that says **directory reachability only**.
5. Exercise the missing-KV path (503), the provider error path, restoration after the next valid check, and deployment rollback. Monitor Cron failures and provider rate limits before customer rollout.

## Caveats
Cloudflare Cron granularity is a minute, so the **15-second market freshness setting** remains a client-side quote freshness assessment, not a server-side 15-second Cron fetch. The existing 2-minute RSS checks may need adjustment if upstream terms or limits require lower request frequency. A channel marked `failed` based on direct browser playback is not equivalent to failed directory access. The cron schedule and read-only reporting are code-implemented and CI-tested, but **live deployment and scheduled execution are not verified**.
