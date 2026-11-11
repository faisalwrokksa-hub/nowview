# NewView Markets — Android release signing and upgrade policy

**Status:** Development policy and opt-in signing helper; not an issued production key or approved public release.

## Identities and test builds
- Current development preview packaging names are `build/newview.apk` and `build/newview-unsigned.apk`, as checked by CI. These names are not production-release designations.
- Production candidate application ID: `app.newview.dashboard` (independent of the original Fintech app).
- CI's `build/newview.apk` is a **test-only** APK. It is signed by a local automatically generated key with a known test password, possibly different on every runner. **Never distribute or market this as a customer release.**
- `build/newview-unsigned.apk` is aligned but unsigned. It is the input to the separate owner-controlled signer.
- The previous NowView preview package `app.nowview.markets` also has a different Android application ID and will not be upgraded in place; remove old preview installations only after exporting any desired local preferences. The original Fintech app uses a different application ID; the two can coexist but do **not** upgrade one another. Local NewView test builds may also not upgrade each other if signatures differ.

## One-time owner setup (outside GitHub)
1. The product owner selects the final application ID and supported store distribution channel before creating the first production signing identity.
2. Create a **dedicated strong release keystore** on a trusted local device or approved secret/signing service, not in the repository, using the Android signing documentation. Back it up securely in two controlled locations; losing it may prevent future upgrades.
3. Review the eventual Play App Signing requirements separately if publishing on Google Play. The Play upload key and distribution signing identity may differ.
4. Keep keystore paths and passwords out of repo files, GitHub logs, shell history, screenshots and PR comments.

## Owner-invoked signing (Linux/macOS)
After the draft branch passes CI and the owner has completed signing setup:

```sh
# Build the aligned unsigned artifact (requires Android SDK 34 + Java 17):
bash build-apk.sh

# Provide these variables securely and locally; do not paste real values into chat.
# NEWVIEW_RELEASE_KEYSTORE=/absolute/path/outside/repo
# NEWVIEW_RELEASE_ALIAS=...
# NEWVIEW_RELEASE_STORE_PASSWORD=...
# NEWVIEW_RELEASE_KEY_PASSWORD=...
bash sign-release.sh
```

The helper fails closed if required inputs are missing or a release artifact already exists. It reads passwords from the local environment via apksigner's `env:` provider and verifies the signature. Do not put release secrets in GitHub PR workflow variables.

**Windows:** this batch preserves the test APK build on PowerShell; release signing from Windows is not yet separately scripted/validated. Use the documented Android tooling on a trusted machine or implement a securely reviewed Windows equivalent later.

## Upgrade gate
- Bump `android:versionCode` strictly upward for each delivered customer APK and update `versionName` appropriately.
- Verify same application ID, correct signing lineage and increasing `versionCode` with `apksigner`, `aapt` and a real-device `adb install -r` test.
- Test a clean install and upgrade from **the actual previous production-signed APK**, not a CI test APK.
- Check retained preferences, runtime permissions, D-pad behavior, chart sourcing, errors and accessibility/overlay opt-in after upgrade.
- Archive the signed APK's SHA-256, versionCode, signer's certificate fingerprint and approved release notes securely.
- Record per-device testing, store restrictions, privacy/legal review and explicit owner sign-off before any distribution.

## No-go conditions
No public release if certificate continuity, install/upgrade tests, financial data display rights, app security/privacy, or legal clearance are incomplete. **No agent should create or upload a keystore automatically or merge/release the code without separate approval.**
