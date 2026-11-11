# NewView × TheOrg — Bulk modernization audit and integration gates
Date: 2026-11-10
Status: **NewView source inspected; legacy archive not yet readable in execution environment. No legacy feature is certified as present.**
Review-only PR: #25. No production merges or deployments.

## Confirmed NewView source inventory
The following files were fetched from branch `feat/newview-reference-theme-20261110`:
- `web/index.html`: five workspace navigation buttons, display profile/refresh/fullscreen controls, wallpaper controls, public source directory, MyView controls and TV installed-app actions.
- `web/workspace-shell.js`: five workspace identifiers, first-launch preferences, device-local display profile handling and source-disclosure labels.
- `web/myview.js`: MyView customization implementation; inspect persistence and layout migration before changes.
- `web/tv-home.js`: Android app bridge conditional, TV home actions, app favorites, settings and Back handling.
- `web/media.js`, `web/watch.js`: media/watch integrations.
- `web/business.js`: business workspace.
- `web/social.js`: social workspace.
- `web/style.css`: shared theme and responsive CSS.
These observations establish code presence, not passing runtime behavior.

## Legacy TheOrg intake gate
- Input: user-provided `TheOrg(1).zip`.
- The archive could not be opened in this execution session; do not claim its modules, licenses, capabilities or architecture have been inspected.
- Before migrating anything, extract to a quarantined review directory; record file manifest, hashes, frameworks, licenses, dependency versions, entrypoints, Android package IDs and any embedded credentials. Do not execute untrusted scripts.
- Produce a side-by-side matrix: legacy feature, source path, screenshot/behavior evidence, NewView equivalent, reuse feasibility, license status, migration effort, and regression tests.
- Reuse only user-authorized and license-compatible source. Never overwrite NewView persisted profiles, data adapters, Android application ID or signing.

## Bulk implementation batches (independent review commits)
1. **Visual parity:** map legacy layouts against NewView design tokens and responsive card grid. Build visual gallery and screenshot diffs at 390/768/1440/1920 widths. No functional changes.
2. **Navigation and icons:** use one SVG/icon family; preserve all five data-view-button values and existing click handlers. Validate keyboard/D-pad, focus restoration and TV overscan.
3. **Home/launcher:** compare legacy launcher behavior with `tv-home.js`. Gate installed-app enumeration/launch through `NewViewApps` capability detection. Preserve original launcher recovery and avoid silent default-launcher changes.
4. **Personalization:** compare presets, drag/drop, wallpaper and per-TV display profiles. Implement explicit versioned migration only if legacy state is imported; include rollback and missing-storage handling.
5. **Markets/Business/Media/Social:** retain source disclosures and all existing API adapters; change presentation only until contract tests pass. Never claim unlicensed feeds or ad bypass.
6. **Android integration:** locate actual Android entrypoint and asset-copy pipeline, verify web CSS and SVG are bundled, then run build/emulator/device D-pad smoke tests. No signed APK claim without artifact and checksum.
7. **QA/reconciliation:** compare against concurrent PR #3 and frontend PRs; check tests, build, screenshots, accessibility, licensing and conflicts. Deliver review-only PRs with evidence.

## Release gates
- **G1 Source audit:** TheOrg archive manifest + license review verified.
- **G2 UI:** visual comparison screenshots and accessibility checks verified.
- **G3 Behavior:** existing dashboard actions and saved preferences regression-tested.
- **G4 TV:** actual APK assets, emulator or hardware D-pad and media playback verified.
- **G5 Integration:** clean conflict resolution and green required CI.
No automatic merge, deploy, signing or production data modification.

## Current verified implementation
Draft PR #25 has shared reference-theme CSS and five accessible SVG navigation icons; other dashboard component and APK changes are not verified complete. Treat all unchecked gates as pending.
