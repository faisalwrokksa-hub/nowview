# NewView 1.0.1-rc1 — repair candidate (Android versionCode 2)

## Evidence boundaries
Source review and GitHub Actions compilation are not physical-device reproduction. The reported rk3566_rgo Android 14 projector at 192.168.16.112:5555 is **not connected to the CI runner**. Device logs, startup loops, player codecs, actual stream playback, screen captures, and upgrade behavior require ADB on the owner's LAN.

## Source defects addressed
- Android IPTV bridge previously serialized an entire large M3U file into one evaluateJavascript call. It now delivers bounded chunks; the JS receiver enforces a 16 MB limit and timeout.
- Default workspace filtering previously hid channels from otherwise valid directories; default is now All, with explicit loaded/matching counts. HTTPS-only remains on by default.
- EXTINF titles previously split at the first comma, including commas inside quoted attributes; parser now locates the unquoted delimiter.
- Native news callbacks previously shared a single replaceable callback. Pending requests are now keyed by ID, with stale callbacks rejected.
- Android TV Home previously exposed controls and widgets as a dashboard. A native-WebView TV presentation now shows Riyadh time, the in-app market chart, MR7 TV and NewPipe favourite launch buttons, All apps, and Settings. Original system launcher remains installed and selectable.
- Android candidate versionCode increased from 1 to 2; package unchanged.

## Acceptance matrix
| Check | Status | Evidence or blocker |
| --- | --- | --- |
| Source inspection | Pass | Reviewable feature branch commits |
| JS parser regression | Pending | CI job tests/tv-home-repair.test.mjs |
| Java/Android compilation | Pending | GitHub Actions APK build |
| TV Home layout on physical 1920x1080 | Not tested | ADB + projector screenshot required |
| Android WebView 113 behavior | Not tested | Physical projector required |
| Restart/crash reproduction | Blocked | No device logs or ADB connection |
| D-pad, Back, Home, sleep/wake | Not tested | Physical projector required |
| IPTV directory through native bridge | Not tested | Android UI and logs required |
| IPTV stream switching/fullscreen | Not tested | Android player/codec and source availability required |
| SEC/Fed RSS via native bridge | Not tested | Android UI and logs required |
| Market price/alert correctness | Not tested | Live data and device session required |
| Phone layout | Not tested | Phone or Android emulator required |
| Clean install | Not tested | Device required |
| Upgrade from build 258 | Blocked | CI test keys are ephemeral; certificate continuity must be checked |
| Production signing | Blocked | Permanent owner-held keystore unavailable |
| Third-party streaming rights | Not tested | Individual channels and distribution terms require review |

## Device verification commands
Run from a trusted PC on the same network (do not expose ADB port 5555 to the internet):

```sh
adb devices -l
adb connect 192.168.16.112:5555
adb shell getprop ro.build.version.release
adb shell dumpsys package app.newview.dashboard
adb logcat -c
adb shell am force-stop app.newview.dashboard
adb shell monkey -p app.newview.dashboard 1
adb logcat -d -v time > newview-device-log.txt
adb shell screencap -p /sdcard/newview-home.png
adb pull /sdcard/newview-home.png
```

Before `adb install -r`, compare signing certificates. A different test certificate cannot upgrade the installed app; uninstalling removes local NewView preferences and wallpaper. Export any desired local data first. Do not disable the existing Android launcher.

## Release notes
Candidate adds a TV-focused Home, source-safe IPTV chunk loading, clearer channel filtering, native RSS callback isolation, and regression tests. Native VideoView remains the playback backend and is **not** Media3/ExoPlayer; HLS compatibility is device-specific and not certified. This is a development candidate, not a production release.
