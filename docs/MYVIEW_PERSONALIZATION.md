# MyView local dashboard personalization

- MyView defaults to three configurable tiles: Markets, News, Media.
- The owner can pin/unpin five workspace launch tiles: Markets, News, Media, Business and Social; reorder tiles via focusable up/down buttons, reset to defaults, or leave the dashboard empty.
- Tile content includes source descriptions and navigation actions. It **does not display fabricated metrics, fake social feeds, or claim unconnected providers are live**.
- Preferences persist as an allowlisted array under `newview.myview.widgets.v1` in local device/browser storage, with limits and duplicate filtering. Older/invalid/corrupt preferences fall back safely. No account or server synchronization.
- Mobile layouts collapse to one column; TV layouts are focusable with remote control. No external dependencies.
- Future improvements: actual shared widgets with verified data, authenticated multi-device sync and granular source permissions.

QA: automated preference validation, storage fallback, no fabricated data, asset packaging. Requires on-device visual accessibility/remote focus checks before a production release.
