# NewView — Cloudflare scheduled source-health monitoring

## Code implementation
The Worker includes a `scheduled(event, env, ctx)` handler and Wrangler Cron `*/2 * * * *`. Every two minutes, it checks **only** the nine allowlisted public RSS sources through the same bounded XML parser used by the public news endpoint. An IPTV-org master-directory reachability check runs no more frequently than once every three hours using a 16 KiB response safety limit. No arbitrary user-supplied URL is fetched, and individual IPTV playback is **not** claimed to work based on a directory check.

Snapshots are stored in the optional Cloudflare KV binding **`NEWVIEW_SOURCE_HEALTH`** with a seven-day expiration. The read-only `GET /api/source-health` endpoint publishes coarse source status and checked timestamps; it returns **HTTP 503**, not simulated data, when KV is absent or no valid snapshot exists.

MyView displays a verified Cloudflare status only if the snapshot is sufficiently recent. It continues its existing local checks while NewView is open; the server checks depend on the configured Cron trigger and deployed Worker, not the web page being open.

## Deployment requirements (not performed from this development branch)
1. Use the **correct production Cloudflare account**. Confirm the project's Worker or Pages advanced-mode deployment supports Cron triggers. If the site is hosted only on Pages without independent scheduled Workers, deploy the scheduled handler as a separate Worker in the same account.
2. Create a new Cloudflare KV namespace for **`NEWVIEW_SOURCE_HEALTH`**. Bind it to the Worker using its actual namespace ID; do **not** substitute `NEWVIEW_SYNC` or commit a placeholder ID. This repository intentionally does not invent an account-specific binding.
3. Deploy the correct revision after review, and configure the actual Cron schedule `*/2 * * * *`. Verify the real binding and schedule in Cloudflare's dashboard. No scheduling occurs from GitHub CI alone.
4. Run the scheduled handler using a Cloudflare scheduled-event test, then verify `GET /api/source-health` produces a timestamped snapshot with exactly the approved feed identifiers and an IPTV status that says **directory reachability only**.
5. Exercise the missing-KV path (503), the provider error path, restoration after the next valid check, and deployment rollback. Monitor Cron failures and provider rate limits before customer rollout.

## Caveats
Cloudflare Cron granularity is a minute, so the **15-second market freshness setting** remains a client-side quote freshness assessment, not a server-side 15-second Cron fetch. The existing 2-minute RSS checks may need adjustment if upstream terms or limits require lower request frequency. A channel marked `failed` based on direct browser playback is not equivalent to failed directory access. the cron schedule and read-only reporting are code-implemented and CI-tested. A passing exact-revision Worker check verifies a live code revision, **not** that every Cron invocation executed on schedule or that upstream sources were available.

## Request budget and failure handling (planning estimates, not measured usage)

- Worker Cron is scheduled once every 2 minutes: **720 scheduled invocations/day** when the schedule executes continuously.
- Each invocation fetches **9 allowlisted news sources**, for up to **6,480 source requests/day** before retries, plus an IPTV directory reachability probe at most every 3 hours (**8/day**), if configured and executing normally. This is *not* Cloudflare request billing or actual observed traffic.
- A continuously open browser performs a bounded **3-feed sweep per 2-minute cycle**, up to **2,160 feed checks/day per active client**, plus up to **720 read-only source-health requests/day**. Actual counts depend on page visibility, network, automatic checks and user activity.
- Client market freshness is evaluated every **15 seconds** from existing quotes, without an additional Binance request. Do not confuse these evaluations with Cloudflare subrequests.
- Network calls use bounded timeouts. A failed upstream source is marked unavailable, an overdue monitor result becomes unknown, and offline clients stop checks until reconnection. Directory reachability never proves individual playback or rebroadcast rights.
- Monitor the real Cloudflare request/subrequest counters, upstream response codes, timeout rates, errors, KV write/read counts and DO Access failures before declaring tier headroom. Never infer plan eligibility or actual spend from this document.
