# Existing Cloudflare Worker `nowview` — bulk repair handoff (2026-11-09)

## Live settings last checked
- Cloudflare account `d971aa01a0cdd29f016ff88565aded43`; project `nowview`.
- Cloudflare UI environment is labeled **Production**.
- Git source `faisalwrokksa-hub/nowview`, branch `main`.
- Build command **empty**, deploy command `npx wrangler deploy`, root `/`.
- Last recorded Cloudflare build FAILED: Wrangler could not detect a static asset directory, since no configured entrypoint/bundle was available.
- `workers.dev` was **disabled** at the last dashboard check, but `wrangler.json` now requests `workers_dev=true` on this draft branch for the requested public website launch.

## Ready in Draft PR #3 review branch
- `wrangler.json` with `main=dist/server/index.js` and `workers_dev=true`.
- `npm run build` already produces the Worker bundle for cloud APIs and embedded frontend assets.
- Tests: `tests/cloudflare-worker-build.test.mjs`; GitHub Android/web and Expert2 safety workflows have passed.
- Preflight workflow `.github/workflows/cloudflare-worker-preflight.yml` executes Wrangler 4.158.0 `deploy --dry-run` and does **not deploy**.

## Required owner action, single settings save
Open https://dash.cloudflare.com/d971aa01a0cdd29f016ff88565aded43/workers/services/view/nowview/production/settings and scroll **Builds**:
1. Production branch: `feat/expert2-apk-audit-20261109` (only if this existing Worker is explicitly intended as a disposable staging environment; branch field remains labeled Production).
2. Build command: `npm run build`.
3. Deploy command: `npx wrangler deploy`.
4. Root directory: `/`.
5. Save then retry the build.

**Do not** paste the Pages-specific `npm run build:pages` command into a Worker configuration. Do not delete `nowview`, disable safety checks, publish customer data, or enable a custom domain.

## Alternative if production isolation matters
Create a separate Workers/Pages **staging** project tied to a staging branch and leave the existing Production service untouched. The project name must be unique. This avoids moving Production to unfinished draft code.

## Validation after owner applies settings
1. Check latest Cloudflare build logs for `Success` and deployed version.
2. Distinguish successful deploy from URL activation: `workers.dev` is configured on the review branch; after deployment, check in Cloudflare whether the public subdomain is enabled and accessible.
3. When an isolated staging URL exists, validate `/`, `/index.html`, `/workspace-shell.js`, `/watch.js`, `/api/chart` and `/api/news`, plus response content types, no sensitive source leakage, five tabs and mobile/TV behavior.
4. Crosscheck Cloudflare build commit/branch against PR #3 head; do not infer main was updated.
5. No production merge, DNS change, installed APK replacement or sign-off until separate user approval.

This is a **verified configuration repair**, not a claim that Cloudflare build was fixed remotely. The connected browser has read-only access.

## Website launch authorization update
On 2026-11-09 the owner explicitly requested a publicly accessible website now. The draft branch therefore sets `workers_dev: true`. This does **not** publish anything until the selected Cloudflare project builds that branch. Paid subscriptions, live backend accounts, native Android features and API auth remain separate from the public dashboard. Do not describe these as live merely because the Worker is live.
