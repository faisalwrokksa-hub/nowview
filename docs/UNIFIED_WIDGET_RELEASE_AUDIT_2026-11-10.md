# NewView unified widget release audit — 2026-11-10

## Implemented in this release
- MyView market widget renders an SVG trend from **verified quote events observed during the current session**; no fabricated candles or historical values. Until two distinct prices arrive, it displays a waiting state.
- Drag-and-drop reordering on pointer-capable browsers; existing accessible Up/Down controls remain the TV and keyboard alternative.
- Media widget provides an explicit launch into the existing Watch & News player. **It does not claim embedded IPTV or floating video playback.**
- Existing local-only profile saving, native TV app discovery, remote navigation, alerts, and source integrations are preserved.

## Required acceptance tests
1. Android TV 1920x1080: D-pad traversal, widget reorder buttons, launcher, native PipeTv handoff/failure states.
2. Desktop 1440x900 and laptop 1366x768: no horizontal overflow; drag widget reorder persists after reload.
3. Tablet 768x1024 and mobile 390x844: panel tabs show pinned widgets, no hidden panel trap, no horizontal overflow.
4. Live quote: initial waiting state, two source events draw a line, ticker changes do not blend symbols, refresh does not fabricate history.
5. Video: Watch & News navigation works, unsupported IPTV is accurately labeled, browser player honors source restrictions.
6. Profiles: saved per-device preferences persist; do not imply cloud sync.
7. Alerts: existing alert toggle and light work, stale/failed data is not represented as live.
8. Automated GitHub workflows all pass before merge. After merge, verify Cloudflare Ready version, release commit, 100% traffic, and smoke-test the production URL.

## Explicitly deferred
- Floating embedded video and native IPTV playback on all platforms.
- Persisted synchronized cross-device user accounts.
- Advanced configurable alert rules and production push notifications.
- Automated screenshot and physical-device end-to-end tests.

Do not mark these deferred items complete based on source checks alone.
