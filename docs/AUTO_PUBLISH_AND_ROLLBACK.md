# NewView publishing and rollback

Production Worker: `nowview`, https://nowview.faisalwrokksa.workers.dev.
Repository: https://github.com/faisalwrokksa-hub/nowview.

## Active path: Cloudflare Workers Builds

Use the existing GitHub integration and Cloudflare-managed build token. Production branch is `main`; all other branches are previews. Keep automatic builds enabled and include path `*`.

Build command: `npm run verify` (all Python tests, every Node test, JavaScript syntax checks, Worker and Pages builds). Deploy command: `npx wrangler deploy`. A failing build command prevents deployment and leaves the previous production version active. Node is pinned to 22 by `.node-version` and the existing Cloudflare build variable. No new paid service or mail integration is required.

GitHub Actions runs the same frontend validation on development pushes and PRs. The dashboard check additionally builds the preview Android APK and checks its assets. Merge only after the three required workflows and frontend validation pass. Changes appear after the asynchronous Cloudflare build completes, not instantaneously.

`/version` exposes only the deployed source revision, taken from `WORKERS_CI_COMMIT_SHA` (Cloudflare) or `GITHUB_SHA` (Actions). `/healthz` measures Worker readiness only, not upstream availability. Verify the active deployment's commit and `/version` after publishing.

## Optional GitHub deployment path (inactive by default)

`.github/workflows/frontend-auto-publish.yml` validates all frontend development pushes and PRs. Its publishing job requires `main`, successful validation and repository variable `FRONTEND_DEPLOY_VIA_GITHUB=true`. Manual dispatch additionally requires the `deploy` checkbox. Leave this variable unset while native Workers Builds is active, to avoid duplicate deployment races.

To switch to GitHub deployment:

1. In https://github.com/faisalwrokksa-hub/nowview/settings/secrets/actions add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Account ID is `d971aa01a0cdd29f016ff88565aded43`. Create a token in Cloudflare with Workers Scripts Edit scoped only to this account. Never put token values in source, logs or chat.
2. Configure environment `newview-frontend` at https://github.com/faisalwrokksa-hub/nowview/settings/environments. Restrict it to `main` and use required reviewers if the repository's free plan supports them.
3. Disable native production builds before enabling `FRONTEND_DEPLOY_VIA_GITHUB=true` in repository Actions variables. Do not run two production publishers.
4. Merge the approved PR to `main`; tests block the publishing job on failure. The workflow reads credentials exclusively from GitHub Secrets.

## Rollback

1. Stop new merges and pause automatic publishing while restoring a release.
2. In Cloudflare Worker `nowview` → Deployments, select the previous known-good version and roll back to 100% traffic. This does not change Git history.
3. Revert the faulty source commit through a reviewed PR, run all checks, then resume automatic publishing. Otherwise a later push can overwrite the rollback.
4. Check `/healthz`, `/version`, every workspace, settings, assets and playback. Record both source SHA and Cloudflare version ID.

Do not rotate Android signing keys or distribute the locally signed CI APK as a production upgrade. Physical-device acceptance remains separately required.
