# Expert 2 APK alignment audit — 2026-11-09

## Sources inspected
- Uploaded `newview-expert2-frontend.zip`, nested `frontend/NewHome Apk.zip`, APK `NewView-Home-1.0.260-signed.apk`.
- Uploaded `newview-expert1-backend.zip` shared contracts.
- GitHub branch `align/apk-home-1.0.260` and its `web/` directory.
- Existing `NEWVIEW_APK_ALIGNMENT_MASTER.md` on the alignment branch.

## Verified binary
- APK size: **2,805,209 bytes**.
- APK SHA-256: `f44e4cc3cb7b133eb4f7c2e71c62047d08c107d8e9ffa56158a03ce4fc6d8cd8`.
- One `classes.dex` and binary `AndroidManifest.xml` present.
- User-reported installed behavior is **not** independently verified.
- Package identity, signing fingerprint and manifest flags require Android SDK inspection.

## Discovered gaps in GitHub web source
The binary contains these assets absent from the alignment branch's `web/`:
| APK asset | Byte size | SHA-256 |
|---|---:|---|
| `assets/home.js` | 16605 | `bba726f861d15ebb2b7b0e5ca7f6145b63f28cc439a6f8bd53eb0420953e95b7` |
| `assets/home.css` | 7955 | `f872c3d093bf90dc0e8cd75d17169794be553f8d1989e30c8727ac971289a1cf` |
| `assets/refined.css` | 11889 | `3c3c327df23319079de8562a2affbebdb8f09429071ca5e141fcaf63c1549e58` |
| `assets/rss.js` | 6532 | `4b2577ac7d5c136f6e5197771529477f3f8562342dee87c2532b3fc5b37416d7` |
| `assets/topics.js` | 3803 | `37179012e5a237e42e06120e9dddea80e9dda18fbd360d69026f4de989bcfe9c` |
| `assets/watch.js` | 1575 | `137e531858badb3c3f7ddd6dfcdebea39b03d9a3cfd702278fbbceb27edee763` |
| `assets/tiger.png` | 2022027 | `9d887c9c6ef16006266bae6dd4250405689777db4d26c835471be80307705327` |

Other packaged assets include `index.html`, `app.js`, `business.js`, `market-data.mjs`, `media.js`, `myview.js`, `news.js`, `social.js`, `workspace-shell.js`, and attribution notices. An overlapping filename is not proof of byte identity. Compare SHA-256 of *all* overlapping web assets before promoting the APK snapshot as source of truth.

## Hard blockers
1. `NewView-Home-1.0.260-source.zip` absent; a compiled APK is not the original Android source/build project.
2. APK signing key/certificate upgrade path unverified; never overwrite or uninstall installed app.
3. Physical Android TV/projector, remote focus, media and browser QA unavailable/not performed.
4. Review upstream asset provenance and third-party notices before checking extracted assets into version control.

## Next non-destructive implementation sequence
1. Use `aapt2` / `apksigner verify --print-certs` to inventory package, version, permissions, component exports, certificate.
2. Diff all binary assets against tracked source and reintroduce the missing web assets into a **separate review branch** only once provenance is cleared. Do not replace working legacy modules blindly.
3. Build a source-independent browser shell test and deterministic fixtures for MyView, Markets, Business, Watch & News and Social.
4. Write D-pad focus, split-screen playback and error/offline regression tests. Preserve one native media pipeline.
5. Match Expert 1's existing `/v1` contract (not the older proposed `/api/v1` path).
6. Run Android release build with matching sources and verify signing *before* device migration tests.

## Gate status
| Gate | Status | Evidence |
|---|---|---|
| Binary integrity | Pass | SHA-256, size, ZIP enumeration |
| Asset gap discovery | Pass | APK ZIP vs GitHub `web/` listing |
| Manifest verification | Not tested | Requires SDK binary XML tooling |
| Original native source recovery | Blocked | Source archive missing |
| Reproducible native build | Blocked | Source, signing unavailable |
| Hardware launcher/media QA | Not tested | Physical-device test required |
| Browser QA | Not tested | Browser execution required |
| Production release | Blocked | Owner approval plus above gates |

No release, merge, DNS change or production deployment is authorized by this document.
