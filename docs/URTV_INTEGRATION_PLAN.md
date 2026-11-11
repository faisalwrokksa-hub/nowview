# NewView × UrTV — selective launcher integration gate

Status: Architecture approved for review; **no UrTV code or assets imported**.

Source: https://github.com/tshi-dev/UrTV (tshi-dev/UrTV, master)
Source areas to audit: android/launcher, android/app (screensaver), src/template.html, optimize/dock.sh, optimize/photos.sh, optimize/reset.sh, docs/TEST-PLAN.md, THIRD_PARTY_NOTICES.md.

## Product ownership
- NewView remains the sole app/product and UI shell, using its existing Android package and web dashboard architecture.
- Preserve MyView, Markets, Business, News, Media, Social; local wallpapers and TV profiles; Binance read-only markets; official YouTube embed and separately installed PipeTv handoff.
- No wholesale merge of the UrTV repo, no APK bundling, no copied photo/font/audio/brand assets.

## Rights gate — blocking
UrTV's root GitHub listing inspected on 2026-11-08 did not display an explicit top-level LICENSE file. Its THIRD_PARTY_NOTICES.md is not a grant of rights to UrTV source. Confirm copyright ownership and explicit commercial modification/redistribution permission or a compatible SPDX license before copying any UrTV implementation. Until then, clean-room independently implement ideas using Android SDK APIs and NewView's original code.

## Candidate modules and acceptance
1. Apps grid and favorites: Android PackageManager LEANBACK_LAUNCHER / LAUNCHER queries, app launch with user click, sorting, favorite ordering; validate missing/uninstalled packages and Android 11+ package visibility.
2. TV launcher HOME: explicit user selection only, original launcher kept intact, recovery settings and reboot/Home-button test on each OEM.
3. Customer wallpapers: keep existing local image upload; later add per-profile gallery, EXIF stripping on native photo import, rotation, bounded storage.
4. Screensaver: optional module behind feature flag, no intrusive permissions, no copyrighted stock photos by default.
5. Settings: TV-native accessible navigation, settings/recovery entry and D-pad focus.
6. Multi-TV customization: local profiles first; pairing/cloud sync only after secure identity design.

## Explicit exclusions
- No OEM debloating, ADB disabling of Google launcher or setup wizard, automatic install of SmartTube or other APKs, system settings modifications, external network setup scripts, background autoplay or remote control without consent.
- Do not import UrTV religion/sports/market services unless independently scoped, rights-reviewed and approved; NewView existing market semantics must not change.
- Do not expose Android JavaScript bridges to arbitrary external URLs.

## Next engineering gate
Locate existing NewView android/src MainActivity.java, review its WebView navigation and existing NewViewNative bridge. Register LauncherAppsBridge only for trusted local assets; adapt frontend to call the registered bridge. Compile APK in CI and test on a real Android TV. A helper class exists but is not yet wired or verified.

## Release gates
Licensing audit, source-by-source attribution, Android CI, installed-app launch tests, TV launcher selection and recovery tests, user photo permission/storage tests, security review, and explicit owner approval before merge/deployment.
