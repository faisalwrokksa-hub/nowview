# Android TV/phone device-compatibility hardening

**Batch implemented (review branch only):**
- Allowlisted HTTPS external links for X, Facebook, TikTok, official SEC/Federal Reserve pages and YouTube. The Android host opens links using the operating system's selected browser; nonallowlisted top-level destinations remain blocked.
- App WebView does not itself render linked third-party websites; protects asset-local application context. Subframe navigation is not used to launch external activities.
- Added Android system document picker support for the existing user-selected Business CSV control. One file per selection; WebView receives the selected content URI only. CSV validation/size checks remain in the JavaScript data parser.
- Picker cancellation returns null, and pending callbacks are released on destruction.
- Client-side click interception prevents blocked window/new-tab behavior and delegates only approved links to the installed native bridge.
- Preserves PipeTv separate package launch, JavaScript market bridge and all six workspaces.

**Security scope:** External link allowlist includes platform home domains only, not approved individual creators or their content rights. Social links remain subject to validation in NowViewSocial. User-initiated links might open a browser chooser, or do nothing if no browser handles them.

**Still requiring real-device QA:** Full Android TV remote-navigation, browsers installed on device, activity switch/back behavior, document-provider availability, CSV content URI access, WebView keyboard and PiP behavior. An APK build is not equivalent to successful device testing or permission to commercially distribute third-party media.
