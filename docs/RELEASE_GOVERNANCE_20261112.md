# NewView release-governance and PR consolidation

**Status (2026-11-12): integration PR #167 remains a DRAFT; serving `main` remains unchanged. This document is a release checklist, not proof of approval.**

## Why automatic merging was disabled

The public NewView repository currently reports `main` as **not branch-protected**. GitHub-hosted CI can pass while commercial media rights, physical-device acceptance, APK certificate continuity and owner signoff are still missing. Therefore workflows `.github/workflows/auto-merge.yml` and `safe-auto-merge.yml` are now **manual explanatory guards**, not automatic or scheduled merge jobs. The external reusable merge workflow has been removed.

**Warning:** These workflow updates only become effective on `main` once the draft integration change is approved and merged. Until then, the original automerge code on main may still execute if someone marks a PR ready. Do NOT mark PR #167 ready or release other unreviewed PRs. The owner must apply repository protections directly in GitHub settings before promoting the draft.

## Required protection in GitHub — owner action

Open https://github.com/faisalwrokksa-hub/nowview/settings/rules, create an active ruleset for `main`:
- Require a PR before merging; require an independent approving review and dismiss stale approvals on new commits.
- Require conversation resolution; require successful checks from CI, frontend validation, F1 safety, dashboard, two-APK bundle, Cloudflare preflight and relevant preview. Check names must be verified from a completed SHA; never invent contexts.
- Block force pushes/deletions; disable bypass for unreviewed automation accounts, and prevent deploy/bypass from GITHUB_TOKEN.
- Keep deployment approval separate: the production Cloudflare Git-integrated Worker should only publish an approved `main` commit. Turning on branch protection is a settings action, not something this draft can enforce by code.
- Review available GitHub plan/ruleset capabilities before expecting these settings to apply. If protection is unavailable, keep draft PR #167 unmerged and use an owner-only/manual release process rather than assuming protection.

## PR disposition — consolidated

**Verified count:** 27 superseded PRs closed (unmerged, with source branches retained). Only three draft PRs remain open: #167 (shared integration), #133 (deferred broad TV layout CSS), #166 (reverse staging reconciliation). No production merge or Cloudflare deployment occurred during this cleanup.

## PR disposition

Old overlapping **drafts** have been reconciled into #167 only at the feature-level: MyView source normalization, chart history/currency, publisher article linking, local Business CSV, Watch fallbacks, Social filter reset, focus/compact responsive UX. Do not merge these drafts individually. The 27 superseded PRs are now closed with #167 references and verified CI; **none of their source branches were deleted**. Reopen any original if functionality from it is demonstrably missing. The #133 broad TV layout rewrite and #166 staging reverse-merge are not production candidates and must be reviewed separately.

## Commercial GO / NO-GO

1. `docs/RELEASE_ACCEPTANCE_MATRIX.md` has 12 TV and eight web acceptance records; automated Chromium/Firefox and Android emulator results are separate, not physical passes.
2. `node tools/check-commercial-rights.mjs` must validate source-by-source rights; the seven current categories have status `unverified`.
3. The owner must use external signing keys, verify certificate/versionCode and a real previous-production-APK upgrade. Never sign with the known test key or commit passwords.
4. Record privacy, support, data attribution, sync/WebView security and final owner signoff before any production promotion.
5. Only after GO: use a single controlled Cloudflare native deployment, confirm the exact public `/version`, `/healthz` and asset smoke, and retain the prior Cloudflare version for rollback.

A passing PR check, an APK test bundle, a Cloudflare preview URL, or closing duplicate PRs **does not authorize commercial release**.
