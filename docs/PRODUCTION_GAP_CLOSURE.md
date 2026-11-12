# NewView — Production Gap Closure (Build-first, validation-last)

Status: implementation backlog and release gates, **not a claim of completion**. This document supersedes stale status claims in README; see GitHub PRs and Actions for live state.

## Delivery order (bulk implementation, then final verification)
### Batch A — Reliability and usability
- [x] Cap internal browser navigation history to avoid unbounded memory growth.
- [x] Reject malformed persisted Watch bookmarks and duplicates of curated defaults.
- [ ] Ensure every workspace has usable loading, empty, error, stale, and offline states.
- [ ] Verify keyboard and Android D-pad focus/Back behavior across every overlay and screen.
- [ ] Persist per-device layouts, recover safely from corrupted local settings, and offer reset/export.
- [ ] Document network source refresh limits and retry/backoff policies.

### Batch B — Data and media
- [ ] Audit every Markets label against actual instrument/source semantics; never represent Binance instruments as US listed equities.
- [ ] Implement source timestamp and stale indicators for all displayed market/news data.
- [ ] Review IPTV playlists for legal redistribution and regional availability; prefer publisher-approved playback.
- [ ] Provide explicit unsupported-site fallback rather than promising embedded YouTube homepages or ad bypass.
- [ ] Handle playlist changes, unavailable streams, playback timeouts, and codec incompatibilities.
- [ ] Keep DNS device-managed; optional Cloudflare setup guidance only.

### Batch C — Security, operations, commercial readiness
- [ ] Threat-model browser/WebView navigation, redirects, JS bridges, deep links and local data storage.
- [ ] Confirm least-privilege device sync, access control, expiration and tenant/device isolation.
- [ ] Publish a privacy policy, data-source attribution, licensing register and customer support channel.
- [ ] Measure Cloudflare free-tier usage, upstream request volume and failure handling.
- [ ] Prepare onboarding, pricing, cancellation and export/delete-data flows if subscriptions are introduced.
- [ ] Complete Android release signing with owner-held keys, versioning, upgrade and rollback procedures.

### Final stage — Tests and acceptance (do not skip before public release)
- [ ] Run all automated tests, security checks, Worker and APK builds after implementation batches.
- [ ] Test real Android TV devices: D-pad, playback, overlays, memory, network changes and background/resume.
- [ ] Test web across supported browsers and responsive screen sizes.
- [ ] Verify clean install and upgrade from previous production-signed APK.
- [ ] Verify market/news source accuracy, media rights, privacy, and real user journeys.
- [ ] Obtain explicit release approval; never infer a 10/10 score from passing CI alone.

## Final QA evidence
The runnable hardware, browser, and signing checklist is in [Release Acceptance Matrix](RELEASE_ACCEPTANCE_MATRIX.md). All physical-device tests start as NOT RUN and must be supported by observed evidence before release.

## Release decision
Do not market the app as production-ready until all critical release gates are closed. Build work can be batched before the final QA phase, but release requires testing and approval.
