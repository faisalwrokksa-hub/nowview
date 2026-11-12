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
| UX | #126, #129, reviewed #133 | Adopted narrow-screen settings scroll containment and TV focus/status/reduced-motion behavior without taking the larger unverified #133 page-grid CSS rewrite. |

## Rejected or deferred changes
- Do not merge old feature branches wholesale or merge the staging branch back into `main`. Candidate branches overlap and sometimes predate improvements already on main.
- Keep #133's large responsive TV rail/grid override out of this integration until tested against current simplified shell and real short-screen TV displays.
- Preserve staging's independent branch for comparison and targeted QA; this baseline incorporates its key chart integrity outcomes rather than overwriting main.
- Do not close other PRs/delete their branches until this integration has passed CI and the owner approves which candidates are superseded.

## Verification required
1. Run `npm run verify`: Node tests including `tests/integration-reconciliation.test.mjs`, Python suites, frontend syntax, Worker and Pages builds.
2. Run the `NewView dashboard TV and web` CI job and Android APK packaging gates.
3. Run Cloudflare Wrangler dry-run without publishing.
4. Review changes for MyView valid/invalid/stale quotes and saved cards; 1 MB and malformed CSV imports; Watch catalog failure and stale channel selection; Social filter reset and keyboard focus; narrow mobile settings and RTL.
5. On a nonproduction URL, inspect rendering and interactions. Hardware QA and commercial signing remain independent release gates.

## Rollback and deployment
The currently deployed Worker source must stay on production main unless this baseline is separately approved, merged and verified. A passing integration CI run alone is not permission to deploy. After eventual approval: record baseline SHA, deploy only through Cloudflare native Workers Builds, validate `/version`, `/healthz` and smoke routes, then use the last known-good Cloudflare version as rollback if any failure appears.
