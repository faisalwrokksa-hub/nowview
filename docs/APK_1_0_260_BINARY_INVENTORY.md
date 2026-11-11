# NewView Home APK — observed binary inventory

Source: user-uploaded `NewHome Apk.zip`, containing one file `NewView-Home-1.0.260-signed.apk`.

- APK uncompressed size: **2,805,209 bytes**.
- APK SHA-256: `f44e4cc3cb7b133eb4f7c2e71c62047d08c107d8e9ffa56158a03ce4fc6d8cd8`.
- APK entries include `AndroidManifest.xml`, `classes.dex`, `resources.arsc`, `assets/tiger.png`, `assets/home.js`, `assets/home.css`, `assets/refined.css`, `assets/rss.js`, `assets/watch.js`, `assets/topics.js`, Media3 license notices and standard Android resources.
- The HTML asset loads legacy modules and the additional Home/Watch/RSS/Topics modules. This is a **hybrid** implementation, not evidence that the legacy repository's current build reproduces the APK.
- The current GitHub branch's `web/index.html` and Android manifest do **not** represent the same application package and frontend asset inventory as this binary.
- Package `app.newview.dashboard.repair` and version `1.0.260-repair` are recorded in the supplied developer handover; APK manifest decoding is still required to independently verify these.
- A matching source archive, signing key, on-device test logs and reproducible build evidence have **not** been supplied.

## Decision record
Keep the old application build intact. Align the repository on a separate branch, using the working binary as the reference. Do not assume an APK can replace the missing Java/Kotlin source and Gradle project. No merge, package migration, production signing or device uninstall is authorized.
