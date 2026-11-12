# NewView — Prelaunch operations bulk handoff (2026-11-12)

**Baseline:** `main` at `f83ce149587d746f6a29b2313dea636b81b50b7a` (PR #167 merged). This is a coordination checklist, **not** evidence of launch approval. Preview-only; checkout and paid entitlements remain disabled.

## Already implemented / observed
- PR #167 merged; commercial operations features remain draft/preview-only.
- GitHub repository reports `allow_auto_merge=false`; the legacy auto-merger workflow has been replaced by a manual-only safeguard.
- Cloudflare Workers Builds is the intended single publisher from `main`; GitHub `deploy-production.yml` is a manually dispatched fallback gated by `GITHUB_PRODUCTION_DEPLOY_ENABLED=true` and a confirmation input.
- Prior reports recorded Android Phone Caster and Cloudflare builds passing. Do not interpret them as a production-signed customer release or physical acceptance.
- `tools/smoke-public-newview.mjs` validates public routes and can compare `/version` revision to an exact expected commit; public endpoint verification remains **UNVERIFIED** until a successful independent run.
- Seven source-rights entries in `config/commercial-source-rights.json` are `unverified`; 12 TV + 8 browser scenarios in `docs/RELEASE_ACCEPTANCE_MATRIX.md` are `NOT RUN`.

## Phase 1 — safe development / configuration (no customer release)
1. **Protect `main`** (GitHub repository admin): Settings → Rules → Rulesets → New branch ruleset, target `main`, enable; require PR before merge, at least one review, dismiss stale approvals, required status checks (select actual stable CI check names), conversation resolution, prevent force pushes/deletions, limit bypass to trusted release owner. Validate a test PR cannot bypass the ruleset. This must be configured in GitHub settings; a Markdown checkbox does not enforce it. Do not enable legacy auto-merge.
2. **Deployment provenance** (developer/release operator): from a trusted network, run `NEWVIEW_URL=https://nowview.faisalwrokksa.workers.dev NEWVIEW_EXPECTED_SHA=f83ce149587d746f6a29b2313dea636b81b50b7a node tools/smoke-public-newview.mjs`. Save redacted timestamps, response, SHA and deployment run URL in release evidence. If `/version` is unavailable or mismatches, mark BLOCKED; do not claim deployment verified or deploy a workaround without reviewing Cloudflare build configuration.
3. **Commercial configuration** (product owner): document final market/channel, currency, plans, pricing, refunds, taxes, subscription provider and account lifecycle decisions. Leave checkout, billing webhooks and paid entitlements disabled until commercial acceptance, legal review and payment security checks are complete. Do not add production keys to repository.
4. **Customer policies and support** (product/legal owner): approve the actual support address, privacy policy, customer terms, refund/cancellation wording, data deletion/export text, attribution and distribution URL. Do not publish unapproved templates as final policy.
5. **Rights** (rights reviewer): review each of the seven entries against current licenses/terms, record reviewer, review date and HTTPS source evidence; inspect per-broadcaster rights and geographic restrictions. Do not infer redistribution rights from a public playlist or a working embed. Run `node tools/check-commercial-rights.mjs`; retain NO-GO until genuine evidence passes.
6. **Android signing preparation** (release owner): follow `docs/ANDROID_RELEASE_POLICY.md`. Confirm final application ID, distribution channel, versionCode, independent protected release environment and signing-key custody; never put keys or passwords in GitHub, tickets or chat. A signed candidate is not an authorized release.
7. **Distribution package** (release operator): assemble only a local/read-only candidate manifest with actual APK SHA-256, certificate, package ID, version code, release notes and source commit; leave approval placeholders blank until proven. Do not publish, upload, switch on paid sales or treat CI test APKs as signed releases.

## Final stage — intentionally deferred
- Execute all 12 TV and 8 browser scenarios on real devices/browsers with recorded observed results, including casting, IPTV and upgrade continuity.
- Complete source/rights, legal, privacy, signing and owner approval gates.
- Run `node tools/release-readiness-report.mjs readiness.json report.md` on genuine local evidence. NO-GO until **every** gate passes.
- Only then authorize production-signed distribution and commercial checkout in a separate, explicit release decision.

## Status and blockers as of document creation
| Gate | Status |
| --- | --- |
| PR #167 code merge | Done |
| Automatic merges disabled | Implemented; verify ruleset separately |
| `main` protection | NOT VERIFIED / configure in GitHub Settings |
| Exact live `/version` commit | NOT VERIFIED |
| Commercial/pricing decisions | OWNER INPUT REQUIRED |
| Approved customer policies/support | OWNER APPROVAL REQUIRED |
| Seven commercial rights | UNVERIFIED |
| Owner-signed APK and upgrade proof | NOT VERIFIED |
| 20 manual acceptance scenarios | NOT RUN |
| Paid commercial launch | NO-GO |

References: `docs/RELEASE_ACCEPTANCE_MATRIX.md`, `docs/ANDROID_RELEASE_POLICY.md`, `docs/PRODUCTION_GAP_CLOSURE.md`, `config/commercial-source-rights.json`, `.github/workflows/deploy-production.yml`.
