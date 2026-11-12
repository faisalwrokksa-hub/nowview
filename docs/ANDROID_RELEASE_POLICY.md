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

**Windows (owner-invoked helper):** `sign-release.ps1` now implements the same non-overwriting, local-only release signing policy using Android SDK build-tools 34.0.0 `apksigner.bat`. From PowerShell in the repository checkout, after configuring the **same four protected environment variables on the trusted owner machine** (never in source, scripts or chat):

```powershell
.\build-apk.ps1
.\sign-release.ps1
```

It requires `NEWVIEW_RELEASE_KEYSTORE` to be outside the repository, rejects existing `build\newview-release.apk`, reads both passwords through `env:` providers without inserting their values into CLI arguments, verifies the signature and prints a SHA-256 digest. **The helper has not been used to sign an owner build or tested on the owner's Windows installation; that remains an explicit acceptance gate.** The output must be checked against the previous owner-held signing certificate and installed on the actual devices before distribution.

## GitHub owner-signed release workflow (disabled by default)

The existing `.github/workflows/signed-android-release.yml` is a **candidate-generation** path, not a release publication workflow. It requires `NEWVIEW_SIGNED_RELEASE_ENABLED=true` as a repository variable, manual dispatch on protected `main`, an exact 40-character `expected_main_sha`, and the `approve_release_signing` checkbox. Its `newview-android-release` environment must be configured with independent required reviewers and signing secrets **before** opting in. No customer APK is produced by PR builds.

Once authorized, the job signs both TV and Phone Caster APKs, verifies signatures and writes SHA-256 checksums. It also creates GitHub `actions/attest@v4` artifact provenance and an `signed/CANDIDATE-UNAPPROVED.json` file derived from the **measured** signed APK hashes, certificate fingerprints, package IDs and version codes. The extraction tool is `tools/build-release-candidate-manifest.py`.

The manifest deliberately leaves `previousVersionCode`, distribution choice, privacy/support URLs and owner approval fields empty. These must be filled only after verified human review; do **not** publish the manifest alone as an authorized release. A fresh SHA-256 and matching `sourceCommit` are required for the 20 acceptance records.

## Upgrade gate
- Bump `android:versionCode` strictly upward for each delivered customer APK and update `versionName` appropriately.
- Verify same application ID, correct signing lineage and increasing `versionCode` with `apksigner`, `aapt` and a real-device `adb install -r` test.
- Test a clean install and upgrade from **the actual previous production-signed APK**, not a CI test APK.
- Check retained preferences, runtime permissions, D-pad behavior, chart sourcing, errors and accessibility/overlay opt-in after upgrade.
- Archive the signed APK's SHA-256, versionCode, signer's certificate fingerprint and approved release notes securely.
- Record per-device testing, store restrictions, privacy/legal review and explicit owner sign-off before any distribution.

## No-go conditions
No public release if certificate continuity, install/upgrade tests, financial data display rights, app security/privacy, or legal clearance are incomplete. **No agent should create or upload a keystore automatically or merge/release the code without separate approval.**
