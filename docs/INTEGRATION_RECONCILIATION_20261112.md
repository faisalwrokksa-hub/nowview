# NewView — Shared integration baseline (12 November 2026)

## Goal and boundary
Combine the overlapping fixes on one reviewable branch without touching the serving Cloudflare production Worker, the `main` branch, DNS, signing keys, or private customer data. This branch is **not a production release**. It remains draft until the exact branch SHA passes all required workflows and reviewers inspect functional changes.

## Reconciliation decisions

| Area | Reviewed candidates | Integrated resolution |
| --- | --- | --- |
| MyView | #128, #130, #134, #137–#139, #141–#143, #145, #147–#149, #151, #160; staging PR #166 | Folded cumulative #160 chart/source improvements into the current main. Validate timestamp order, symbol + currency partition, stale/missing quote fallback, verified publisher paths/port and local Business Pulse. Avoid mixing the quote data and instruments from unrelated providers. |
| Business | #132, #136, #146 | Added one opt-in device-local CSV panel beside Power BI, maintained newer CSV parsing, error messages and busy-state cleanup from main, and cleared picker on error so the same corrected file can be retried. |
| Watch / IPTV | #127, #131, #140 | Combined channel selection, inline/floating player disable and catalog failure handling. Preserved main's `aria-busy` reset; a cached catalog is reused only if it belongs to the same source. |
| Social | #135 | Added a keyboard-accessible Clear search and filters action and normalized multi-term matching. Saved profiles/bookmarks are not modified on reset. |
| UX | #126, #129, reviewed #133 | Adopted narrow-screen settings scroll containment and TV focus/status/reduced-motion behavior without taking the larger unverified #133 global page-grid CSS rewrite. A smaller short-landscape 1200px+ TV rail rule has since been added, scoped to non-simplified/non-home layouts; test on actual hardware. |

## Rejected or deferred changes
- Do not merge old feature branches wholesale or merge the staging branch back into `main`. Candidate branches overlap and sometimes predate improvements already on main.
- Do not wholesale merge #133's large responsive TV rail/grid rewrite: the targeted, scoped short-landscape rail covers the narrow-screen use case without changing simplified launcher or Home layout. Real-device acceptance is still required.
- Preserve staging's independent branch for comparison and targeted QA; this baseline incorporates its key chart integrity outcomes rather than overwriting main.
- Do not close other PRs/delete their branches until this integration has passed CI and the owner approves which candidates are superseded.

## Verification required
1. Run `npm run verify`: Node tests including `tests/integration-reconciliation.test.mjs`, Python suites, frontend syntax, Worker and Pages builds.
2. Run the `NewView dashboard TV and web` CI job and Android APK packaging gates.
3. Run Cloudflare Wrangler dry-run without publishing. `wrangler.json` now declares an isolated Preview-specific `NEWVIEW_SYNC_ROOMS` Durable Object binding, not a production instance. The current Git-integrated Cloudflare PR preview check must also pass before this is considered preview-verified.
4. Review changes for MyView valid/invalid/stale quotes and saved cards; 1 MB and malformed CSV imports; Watch catalog failure and stale channel selection; Social filter reset and keyboard focus; narrow mobile settings and RTL.
5. On a nonproduction URL, inspect rendering and interactions. Hardware QA and commercial signing remain independent release gates.

## Rollback and deployment
The currently deployed Worker source must stay on production main unless this baseline is separately approved, merged and verified. A passing integration CI run alone is not permission to deploy. After eventual approval: record baseline SHA, deploy only through Cloudflare native Workers Builds, validate `/version`, `/healthz` and smoke routes, then use the last known-good Cloudflare version as rollback if any failure appears.

## Cloudflare preview failure investigation — provider-side verification still required

As of this integration branch, Cloudflare Workers Builds has failed on PR previews while the `main` production build succeeded. GitHub CI and `wrangler deploy --dry-run` pass. A GitHub check reports only the Cloudflare build ID, not the failing command or its build log: do **not** assert a specific root cause from the check status.

Preview isolation is now declared in `wrangler.json` using `previews.durable_objects.bindings` and the existing local `NewViewSyncRoom` migration/class. Cloudflare documents that each Worker Preview receives its own Durable Object namespace and data when configured this way. There is no binding to a production KV/D1 resource, and no preview routes or cron.

Check the linked failed Cloudflare build under **Worker: nowview → Settings → Builds**. Inspect the first failing command. Under **Branch control**, verify `main` remains Production and Preview Builds are enabled. For the newer Worker Previews model, the Preview command must invoke `npx wrangler preview` (Wrangler 4.135+). Existing older Workers Builds may require a one-time **Set up Worker Previews** migration; that migration cannot be reverted. Review the provider's impact and bindings before switching. If the environment uses a legacy preview command (for example `wrangler versions upload`) and a Durable Object, validate against the provider's documented restrictions before switching.

**Do not** change the Production branch, disable production deployment, enable a paid service, reuse production credentials in previews, or merge PR #167 merely to bypass a failed preview check.

Official references:
- https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
- https://developers.cloudflare.com/workers/previews/resources/
- https://developers.cloudflare.com/workers/previews/get-started/

## Integration quality assessment
- **Code and CI: 8/10** — all six GitHub workflows passed before the latest preview/TV changes; re-run exact-SHA checks after every new commit.
- **Commercial release: 5/10** — the current release matrix records 20 NOT RUN hardware/web acceptance cases, and security, media licensing and signing are incomplete.
- These are subjective readiness estimates, not automated test scores. No production acceptance claim is made.

## Verified preview and automated browser smoke

The Cloudflare integration preview is available at `https://integration-ux-media-business-20261112-nowview.faisalwrokksa.workers.dev/`. A read-only GitHub workflow (`.github/workflows/integration-preview-acceptance.yml`) requires the deployed `/version` revision to exactly match the PR head, then checks HTTP routing/security and exercises the four primary navigation tabs, ArrowRight keyboard focus, horizontal overflow and page exceptions in Chromium at phone/tablet/desktop/TV viewport sizes. Screenshot artifacts are for reviewer inspection.

These checks can reduce the web risk but do not mark the 20 hardware/browser acceptance items PASS. Release signing remains owner-controlled; a local-only Windows signing script `sign-release.ps1` complements `sign-release.sh` without distributing an APK. A structured commercial rights register now prevents an unsupported 10/10 release declaration.
