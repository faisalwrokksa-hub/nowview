# F1 six-asset Git patch — validated handoff (2026-11-09)

The owner-supplied APK was available in the execution workspace. The six missing files were extracted and verified byte-for-byte against the reference archive; the seventh recovered file (`web/watch.js`) is already tracked in this review branch.

## Six files in patch
`web/home.js`, `web/home.css`, `web/refined.css`, `web/rss.js`, `web/topics.js`, `web/tiger.png`.

## Validation
A native `git diff --cached --binary` patch was generated locally from those exact six files and applied to a disposable repository. Every resulting file matched the original bytes and SHA-256; preexisting `web/watch.js` and `web/media.js` remained untouched. `git apply --check` succeeded. Whitespace warnings are caused by preserved reference CRLF/minified content and do not invalidate patch application.

## Application on this draft branch
1. Download `NewView_F1_Six_Assets_Git_Patch.zip` from the conversation and extract.
2. `git checkout feat/expert2-apk-audit-20261109`
3. `git apply --check newview-f1-six-assets.patch`
4. `git apply newview-f1-six-assets.patch`
5. `python3 tools/verify_apk_web_assets.py /path/to/NewView-Home-1.0.260-signed.apk`
6. `git add web/home.js web/home.css web/refined.css web/rss.js web/topics.js web/tiger.png`
7. `git commit -m "feat(expert2): restore remaining six verified APK assets"`
8. `git push` and review draft PR #3.

**Important:** Step 5 is still expected to exit nonzero until eight diverging files and the packaged notices file are reconciled. An existing `web/tv-home.js` should be preserved. No change to `web/index.html` has been authorized merely by adding reference assets.

The connector can commit text but cannot directly read/upload the owner's local binary wallpaper bytes, so the actual six assets are **available as an owner-downloadable patch**, not yet in GitHub. Do not state that source alignment is complete or that the Android app can be safely upgraded.

## Remaining gates
Eight divergent frontend modules, APK manifest and signing verification, original Android native source, physical-device and browser QA, and release approval.
