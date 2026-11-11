# APK ↔ web source byte-comparison — 2026-11-09

Baseline: user-supplied `NewView-Home-1.0.260-signed.apk`, extracted from the frontend handoff ZIP. Comparison against `web/` from `align/apk-home-1.0.260`.

## Method
For each top-level `assets/` file in the APK, compute Git blob SHA-1 over `blob <size>\\0<bytes>` and compare with GitHub's `web/<filename>` blob SHA. This is an **exact byte comparison**, not an approximate name/size check. The PNG remains reference material; it was not checked into the repository.

## Exactly equal (8)
`business.js`, `indicators.js`, `live.js`, `market-data.mjs`, `myview.js`, `public-sources.js`, `social.js`, `stock-board.js`.

## Different content (8)
`app.js`, `channel-filters.js`, `external-links.js`, `index.html`, `media.js`, `news.js`, `style.css`, `workspace-shell.js`.

## Packaged assets absent from tracked web/ (7)
`home.css`, `home.js`, `refined.css`, `rss.js`, `tiger.png`, `topics.js`, `watch.js`.

## Other differences
- APK `assets/THIRD-PARTY-NOTICES.txt` is absent from `web/`; licenses are checked separately.
- The GitHub `web/tv-home.js` is not included by that filename in the APK.
- Eight files match in bytes, **not** proof the full app can be rebuilt.
- Preserve newer repo changes and APK behavior by inspecting meaningful diffs; do not blindly replace entire source tree.

## Reproduction
Run `python3 tools/verify_apk_web_assets.py /path/to/NewView-Home-1.0.260-signed.apk` from a checkout of this branch. Nonzero return code indicates mismatch. Run again after selective reconciliation.

## Gate status
| Check | Status |
|---|---|
| Binary vs GitHub web/ byte comparison | Pass (inventory documented, alignment failed) |
| Seven missing frontend assets restored | Blocked (asset provenance + functional review) |
| Eight divergent frontend modules reconciled | Pending |
| Native Android source recovery | Blocked (original source ZIP not supplied) |
| Signing and manifest identity verification | Not tested |
| Hardware and browser QA | Not tested |
| Release/deployment | Not authorized |

No production, DNS, billing, keystore, merge or installed APK changes.
