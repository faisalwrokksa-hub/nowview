# F1 recovered APK web assets — review staging (2026-11-09)

This is a non-destructive source-recovery milestone. The uploaded owner-provided `NewView-Home-1.0.260-signed.apk` was unpacked and seven missing frontend assets were recovered byte-for-byte, alongside eight conflicting versions stored separately for side-by-side review. A downloadable ZIP has been prepared in this conversation; GitHub does **not** yet contain the recovered binary asset or the replacement code.

## Staged additions (not yet merged)
- `web/home.js`, `web/home.css`
- `web/refined.css`
- `web/rss.js`
- `web/topics.js`
- `web/watch.js`
- `web/tiger.png`

## Divergent copies held separately for review
`app.js`, `channel-filters.js`, `external-links.js`, `index.html`, `media.js`, `news.js`, `style.css`, `workspace-shell.js`.

## Inspection
- The recovered JavaScript files have passed Node syntax check (`node --check`).
- Syntax alone does not prove that the new modules function with the older `index.html` and `workspace-shell.js`.
- The APK's `watch.js` transforms old News and Media tabs into a combined Watch & News experience; loading it without reviewing navigation lifecycles and dependencies is unsafe.
- The APK's `home.js` changes the launcher/Home presentation; review native launcher assumptions, remote focus and recovery before activation.
- The source packages, signing authority, actual Android package ID and device QA remain separate unresolved gates.

## Recommended safe next commit
Commit the seven newly staged assets as **additions only**, with original byte hashes validated against the reference APK. Then create a separate PR for behavioral reconciliation of the eight divergent modules. Preserve `tv-home.js` until the new Home logic is verified on device.

No Android app, production DNS, Cloudflare resources, customer data, or installed apps were modified.
