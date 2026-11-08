# NewView — device acceptance test sheet (real hardware required)

**This is a manual test protocol, not evidence that testing occurred.** Record a separate row and screenshot or recording for each tested device. Do not upload private data or test signing credentials.

| ID | Device / interaction | Expected evidence | Result |
|---|---|---|---|
| TV-01 | Clean install on Google TV and Android TV | NewView banner/name, app launches, six workspace tabs reachable by remote | NOT RUN |
| TV-02 | D-pad left/right/up/down and OK through each workspace | Visible focus, no jumps to hidden controls; input fields retain arrow keys | NOT RUN |
| TV-03 | Back/Return from separately installed PipeTv | NewView returns correctly without background video or crash | NOT RUN |
| TV-04 | External X/SEC/YouTube links with an installed browser | Approved links open in external browser; unexpected redirect does not launch | NOT RUN |
| TV-05 | Device with no browser or no PipeTv | Graceful handling without app crash | NOT RUN |
| TV-06 | App background/foreground and 5-minute idle | No stale playback; market displays last quote timestamp correctly | NOT RUN |
| TV-07 | Home-panel accessibility/overlay opt-in | No screen-content collection; overlay limited to intended home launcher; revocation works | NOT RUN |
| MOB-01 | Android mobile clean install, portrait/landscape | All six workspaces scroll and buttons are touch-accessible | NOT RUN |
| MOB-02 | Choose authorized CSV via system document picker | File parses, local summary accurate; cancel and invalid CSV clear/deny correctly | NOT RUN |
| MOB-03 | Deny file access, offline network and return online | Explicit unavailable state; no fabricated market/news values | NOT RUN |
| WEB-01 | Desktop and mobile web browser | MyView snapshots, market/chart, RSS, media embed and bookmarks | NOT RUN |
| WEB-02 | Keyboard-only and screen reader | Logical focus/tab order, button labels, contrast, announcements | NOT RUN |
| SEC-01 | Unsupported HTTP/file/foreign URL | Not loaded in embedded app or opened externally | NOT RUN |
| SEC-02 | Rotate, repeatedly open/close document picker, restart | No leak/crash; document access only after user selection | NOT RUN |

## Safe local Android debugging commands

Use an owner-controlled test device attached to an authorized computer.

```sh
adb devices -l
adb install -r build/newview.apk
adb shell pm list packages | grep app.newview.dashboard
adb shell am start -n app.newview.dashboard/.MainActivity
adb shell dumpsys activity activities
```

Do not use the test APK for commercial distribution. The previous `app.nowview.markets` test package is distinct; `adb install -r` does not upgrade it. Do not uninstall existing apps until you have confirmed local preferences are not needed.

Acceptance signoff must include device maker/model, Android version, OS WebView/browser version, signer, recorded observations, failed tests and owner decision. Hardware evidence, commercial licensing review, brand/trademark verification, privacy/legal signoff and a real production signing key remain separate gates.
