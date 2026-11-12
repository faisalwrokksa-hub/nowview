# NewView — commercial-launch readiness and release evidence

**Status: NO-GO.** This checklist turns unknowns into an auditable release packet. No rights, real-device tests, production signatures, policies or owner approval have been verified merely by writing this document. Production remains unchanged.

## 1. Pick a defensible commercial launch scope

**Sell the NewView dashboard software and personalization**, not third-party YouTube videos, broadcaster streams, or market-data redistribution rights. Until source-by-source legal review, do not claim that a public IPTV playlist or publicly accessible broadcast is licensed for commercial redistribution.

| Function | Commercial action needed before selling |
|---|---|
| Markets / Binance | Confirm commercial display, caching, attribution and derived-data restrictions |
| Publisher news / RSS | Confirm individual publisher excerpt, caching and hotlink policies |
| IPTV directory | License directory metadata separately from broadcaster content |
| Every live television stream | Obtain specific distribution/territory/embedding permissions **per channel**; otherwise exclude it from a commercial product |
| YouTube | Use approved player/links, preserve branding/ads and player controls; do not sell YouTube audiovisual access as the paid service |
| Social links | Confirm link policy, no unlicensed crawling or misleading live-data representations |
| PipeTv companion | Confirm third-party license, distribution and trademark obligations |

Technical evidence location: `config/commercial-source-rights.json` and `node tools/check-commercial-rights.mjs`. All seven categories are currently `unverified`; do **not** mark them `cleared` on the basis of this checklist.

Official policies to review:
- Google Play intellectual property: https://support.google.com/googleplay/android-developer/answer/9888072
- YouTube API Services policies: https://developers.google.com/youtube/terms/developer-policies
- YouTube embedded-player rules: https://developers.google.com/youtube/terms/required-minimum-functionality

## 2. Select one distribution route

**Option A — managed/direct sideload:** obtain owner-held Android signing key and secure download/distribution channel; verify device installation, controlled update, rollback policy, checksum, support and customer terms. Browser-facing customer policy URLs must still be accessible.

**Option B — Google Play:** verify actual store eligibility and submission policy; production **Android App Bundle (AAB)** generation/Play App Signing and upload identity require separate implementation and review. The current signed-APK workflow **does not constitute a Play AAB release**. Google Play requires a comprehensive, publicly accessible privacy policy linked in Play Console and within the app. Where the app allows account creation, it also requires an in-app and external account deletion route.

Official Google Play user-data requirements: https://support.google.com/googleplay/android-developer/answer/10144311

**Pending owner decision:** distribution channel, legal company name/jurisdiction, privacy and support contact, paid subscription/refund model, supported geographic territories, consumer support expectations.

## 3. Real-device QA: evidence, not simulations

- Execute TV-01…TV-12 on physical Android TV hardware, including real remote navigation, codec/DRM failures, live channels, offline recovery and actual multi-TV pairing/revocation.
- Execute WEB-01…WEB-08 on real browsers/devices, including browser policies, accessibility, blocked embeds, stale data and recovery.
- Keep build-identity details with each record. TV cases must match the exact candidate APK SHA-256; **all PASS cases must match the same 40-character candidate commit**.
- Android TV emulator/Chromium/Firefox checks already reduce engineering risk but cannot certify real broadcast rights or actual consumer hardware.

Create the private worksheet:

```sh
node tools/create-qa-worksheet.mjs newview-release.local.json
```

Fill the **candidate** section only with actually measured APK digests/certificate fingerprints, final version codes, owner-approved HTTPS policy/support URLs, and real owner signoff. Leave `gates` false until evidence is reviewed. Never upload personal customer data, keystores, private QA photos or sensitive pairing links to a public GitHub PR.

## 4. Candidate identity, signing and upgrade continuity

- For signed APK candidates, use the owner-controlled local `sign-release.ps1` or `sign-release.sh` and independently validate package ID/certificate/versionCode using `tools/check-owner-release-upgrade.ps1`.
- The optional `.github/workflows/signed-android-release.yml` now requires manual workflow dispatch **on main**, explicit `NEWVIEW_SIGNED_RELEASE_ENABLED=true`, a matching full source SHA, an owner authorization checkbox and a protected `newview-android-release` environment. It creates signed candidate artifacts and GitHub provenance, not an automatic customer release. Do not enable without verified owner reviewers and protected signing secrets.
- Compare SHA-256 digests against the *actual* signed APKs delivered to QA. Confirm same app ID and signing lineage from previous production APK, or document first-release identity. Never uninstall customer data to hide a failed upgrade.
- Release metadata validator: `node tools/check-release-candidate.mjs newview-release.local.json`. It checks structure/consistency; it **cannot prove a signature or legal approval**, which requires independent inspection.

Review provenance: https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations

## 5. Privacy, customer operations and go/no-go

Finalize `docs/CUSTOMER_POLICY_DRAFT.md` with the **actual** operator, contact, privacy legal basis, data recipients, cookie and sync log retention, user rights, supported devices, support SLAs, refunds and incident process. Do not publish the draft with placeholders.

The Settings interface now has configurable in-app policy/support destinations. In `web/index.html`, the meta slots `newview-privacy-policy-url` and `newview-support-url` are intentionally blank until the **real, approved, publicly accessible HTTPS pages** exist. When blank or unsafe, Settings explicitly reports that commercial policy destinations are pending; it does not link to fictional pages. Before consumer launch, fill both with the approved URLs, verify the links work on Android TV and supported browsers, and reconfirm the exact privacy text matches application data flows.

Use the evidence report (nonzero exit code is expected before release):

```sh
node tools/release-readiness-report.mjs newview-release.local.json newview-readiness.local.md
```

The release report is **NO-GO** unless all of these are documented:
1. 20 accepted physical-TV/manual-browser cases tied to **one commit and one TV APK digest**
2. Seven distinct source/media rights clearances with real reviewer/date/evidence
3. Signed release candidate identity, policy/support URLs and independent owner approval
4. CI success, signing verification, upgrade test, security/privacy review and support readiness

Only then should an authorized owner decide whether to remove draft status, merge to protected `main`, deploy through a single Cloudflare native flow, smoke-test the production commit and record a rollback. **Never promote merely because a report or automated test passes.**

## 6. Current factual status (12 November 2026)

- Automated NewView integration CI and Cloudflare preview have previously passed; the new launch-gating code requires its own CI verification.
- Unverified commercial rights: **7 of 7 categories**.
- Physical acceptance: **20 owner-observed scenarios not recorded as PASS**.
- Signed customer APK + production upgrade: **not completed**.
- Customer privacy/support/billing terms: **draft**.
- GitHub `main` governance and owner deployment authorization: **not completed**.

**Technical launch-preparation can improve without claiming legal or commercial approval. The product is not a certified 10/10 launch yet.**
