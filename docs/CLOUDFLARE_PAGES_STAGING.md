# NewView Cloudflare Pages — staging preparation

**Designated Cloudflare account:** `d971aa01a0cdd29f016ff88565aded43` (browser session displayed `Faisalwrokksa@gmail.com's Account` on 2026-11-09).

**Frontend repository:** private `faisalwrokksa-hub/nowview`. **Review branch:** `feat/expert2-apk-audit-20261109`. **APK alignment base:** `align/apk-home-1.0.260`.

## Safe preview build
This repository already has a Worker build (`node cloud/build.mjs` → `dist/server/index.js`) with public market/news API adapters. A Cloudflare Pages project needs a Pages artifact. `npm run build:pages` now creates `dist/pages/_worker.js` using the existing Worker entrypoint, with no new payment or identity backend. It is Cloudflare Pages **advanced mode**, not a static-only `web/` copy.

Suggested Cloudflare Pages Git configuration:
- Project: `newview-dashboard-staging` (verify name is unused).
- Git source: `faisalwrokksa-hub/nowview` (grant Cloudflare GitHub integration read access to this **private repository only**).
- Production branch field in this **staging-only Pages project**: `feat/expert2-apk-audit-20261109` (a dedicated staging project; DO NOT attach a customer domain).
- Build command: `npm run build:pages`
- Build output directory: `dist/pages`
- Root directory: repository root
- Framework preset: None
- Node runtime: >= 22 in build environment, if configuring explicitly.
- Preview URL: project-generated `*.pages.dev` URL; **do not guess its value**.

## Gates before clicking Deploy
1. Confirm Pages build on GitHub CI (not equivalent to deployed runtime validation).
2. Verify this staging project is independent of other Cloudflare Pages projects, especially THE EPMO.
3. Confirm no secrets/tokens in git or bundle; no backend customer credentials in Pages.
4. Confirm no custom domains, DNS changes, production branch of `main`, or auto-promotion from staging to production.
5. Treat staging as a public internet endpoint unless Access/authentication is configured. **Do not upload customer or confidential data.**
6. Verify market/news HTTP endpoints and browser media restrictions after staging actually exists. Chart/source licensing and live-playback rights need separate review.

## Known product limitations
- The repository HTML presently has six tabs: MyView, Markets, Business, News, Media, Social. The user requested **five**, with combined Watch & News, but `watch.js` is staged and not activated.
- Six APK reference assets have not yet been committed into `web/`. The Pages build therefore reflects the **repository** preview, not an APK-equivalent frontend.
- Android signing, launcher functionality, real TV tests, mobile Safari and deployed Pages HTTP behavior remain unverified.
- Expert 1 backend and account/subscription integration are separate and should not be simulated as live paid entitlements.

## Explicit current state
This document and the build script prepare a possible staging deployment; they **do not create or deploy a Cloudflare Pages project**. Browser connector in Chat mode is read-only and no connected Cloudflare management action is available. A user/Work browser session or Cloudflare API credential with narrowly scoped permission is required to actually create the Pages project.

No merge, external custom-domain DNS change or production deployment is approved.
