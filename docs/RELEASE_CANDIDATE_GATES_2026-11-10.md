# NewView release candidate audit — 2026-11-10

## Implemented in this batch
- Local price threshold editor and alert list; rules persist on the current device.
- Profile JSON export/import for selected widgets and HTTPS IPTV favorites; transfer is manual, not cloud sync.
- Local quote alert messages include observed quote timestamp.
- Existing offline skill registry and deterministic tests retained.

## Required release gates (not waived by auto-approval)
1. All required CI workflows must pass on the exact candidate head SHA.
2. Verify dashboard HTML, JavaScript startup, market updates, widget reorder and profile import on desktop/mobile/TV.
3. Verify native IPTV playback on physical Android TV with authorized streams.
4. Verify remote focus, Back, Home, D-pad, launcher and restart persistence on physical hardware.
5. Configure production signing secrets in GitHub Actions without committing keys; verify package signature, certificate and install/upgrade path.
6. Verify Cloudflare deployed version matches the approved commit and complete live smoke tests.
7. Validate privacy, data age labels, offline mode, network loss, and failed source recovery.

## Not yet implemented / not verified
- Production-signed APK; existing workflow artifact is a test APK.
- Embedded floating IPTV video, full multi-device sync, autonomous AI model inference and advanced alert intelligence.
- Physical Android TV hardware acceptance and Cloudflare production deployment.

Never describe this release as production-certified until the above gates have evidence.
