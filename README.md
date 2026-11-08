# NowView

**Everything you follow. Live.**

NowView is a customizable, multi-screen dashboard product. Start with a **commercially resellable market dashboard** based on the existing Market Charts Android TV + web prototype. Expand deliberately into personalized website shortcuts, cross-device accounts, media feeds, and optional AI features only after the first release is validated.

## Contributor starting point

**Read [CONTRIBUTOR_MASTER_PROMPT.md](./CONTRIBUTOR_MASTER_PROMPT.md) before making changes.** It contains the product scope, original source references, architecture, migration and QA plan, task ownership, and release gates.

### Source project
- Original: [faisalwrokksa-hub/Fintech](https://github.com/faisalwrokksa-hub/Fintech) — **leave it unchanged**.
- Market dashboard prototype: [Fintech draft PR #1](https://github.com/faisalwrokksa-hub/Fintech/pull/1), branch `codex/market-charts-tv-20261108`.
- The original project also includes a Telegram reporting bot, which is explicitly **out of scope** for NowView.
- This repository starts as an independent product and must not merge Fintech's history or secrets by default.

## Product delivery order

1. **NowView Markets 1.0:** reliable market charts, TV remote usability, watchlists, responsive web experience, verified data attribution, installable/tested APK, copyright and redistribution checks.
2. **NowView Personal:** saved layouts, personalized website shortcuts, optional sign-in and synchronization.
3. **NowView Media:** licensed/allowed media integrations, floating video where platform support permits.
4. **NowView AI (future):** optional AI insights and agent feeds, not a prerequisite for release 1.0.

## Working rules

- Private repo; feature branches and reviewable draft PRs; no automatic merges, deployments or paid purchases.
- Never commit credentials, keystores, tokens, private data, or any third-party code before checking its license.
- No trade execution and no false equivalence between Binance tokenized instruments and actual US shares.
- Release only after testing on real TV hardware and completing the checklist in the master prompt.

**Current status:** initial planning scaffold; the Fintech dashboard code has **not yet been migrated**.
