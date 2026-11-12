# NewView — local pilot commercialization workflow (owner runbook)

**Development artifact only; NOT a launch certificate.** This preparation keeps PR #167 in draft and does not deploy, buy cloud infrastructure, sign APKs, collect customer information or grant third-party content rights.

## Launch model decision before paid distribution

NewView can sell **dashboard software, local layout personalization, and optional owner-developed functions**. Do not bundle/resell broadcaster channels, copyrighted videos or restricted third-party data until each actual use is licensed. If rights have not been established, remove affected feeds, player sources or features from the commercial package before signing and redoing QA. The present software should not be promoted merely by editing a rights status field.

**Choose exactly one initial channel:** approved private direct-sideload/enterprise pilot OR a separately implemented Google Play AAB/Play App Signing release. This repository's existing signed APK workflow is **not** a Play-store AAB submission. The optional Android overlay/accessibility feature also requires its own store-policy and user-consent review; do not silently enable it.

## Customer-facing work already available

- **Settings → Getting started & support:** a compact TV-accessible feature/remote-navigation guide, clear third-party/preview limitations, and a manual current-server revision check using only same-origin \`/version\`.
- **Export privacy-safe support summary:** a device-local JSON file containing only channel, source revision when manually checked, coarse connectivity, environment and timestamp. It contains **no** user agent, URL (which could contain a pairing secret), bookmark/CSV data, unique IDs, account data or room links. It is not automatically uploaded.
- **Clear this device’s saved NewView data:** confirmation first; deletes only \`newview.*\` and the three known legacy market-control keys. It does **not** revoke shared pairing rooms, remove external service logs, clear device app storage or promise account deletion. Revoke any active pairing separately from Devices.
- **Release-channel indicator:** \`<meta name="newview-release-channel" content="preview">\` is intentionally not public-production-ready. \`privacy-policy-url\` and \`support-url\` remain blank until real approved public HTTPS endpoints exist. Do not switch to production or add fictitious contacts.

## Owner/local review inputs — never commit private data to GitHub

Generate new files on the authorized owner workstation:
\`\`\`sh
node tools/create-qa-worksheet.mjs newview-release.local.json
node tools/create-private-rights-worksheet.mjs newview-rights.private.json
\`\`\`

The two files start **NOT RUN/UNVERIFIED**. Required rights categories are market data, publisher news, directory metadata, each broadcaster's streams, official YouTube, social links and third-party companion apps. For every clearance, document current usage scope, reviewer, date and a trusted evidence reference. Keep confidential contracts in restricted owner-controlled storage rather than in public GitHub.

Perform the 12 physical-TV and 8 browser acceptance cases against the same exact source commit and signed TV APK hash. Keep private tester/device information out of public PR comments.

The supported local report now accepts a **private rights file** without modifying public repository evidence:
\`\`\`sh
node tools/release-readiness-report.mjs newview-release.local.json newview-readiness.local.md newview-rights.private.json
\`\`\`

Expected today: exit status 1, **NO-GO**. The tool will not overwrite an existing readiness report. It checks structure/consistency, **not legal authenticity, signer trust or a human's actual execution**.

## Owner-held signed release candidate

After selecting the distribution channel, owner identity, final policy/support URLs and signing key:
1. Sign both Android APKs from the authorized commit, using the existing owner-controlled signer or explicit manual workflow. Never use development test signatures for commercial upgrades.
2. Verify Android package ID, signature certificate fingerprint and increased versionCode against the previous owner release using \`tools/check-owner-release-upgrade.ps1\`. A fresh first launch has different migration requirements; do not silently uninstall a previous app.
3. Optionally extract the actual signed APK hashes and fingerprints using \`tools/build-release-candidate-manifest.py\`, which leaves approvals empty; copy real measured fields into the private worksheet.
4. Have the authorized owner/legal/security reviewers approve the real QA and rights evidence. Set \`gates\` true only after independent verification.

## Dry-run release package before distribution

The local assembler is **read-only by default**. It requires the private rights record, all 20 PASS observations, release-candidate metadata, owner approval, all seven recorded gates and two signed APKs whose actual SHA-256 bytes match the candidate.

\`\`\`sh
node tools/assemble-release-bundle.mjs newview-release.local.json newview-rights.private.json \
  /secure/tv-owner-signed.apk /secure/phone-owner-signed.apk release-out
\`\`\`

It returns **NO-GO** or an eligible preview; it does not write a package. After the explicit owner review, add \`--create\` to write a new, nonexisting \`release-out\` directory containing the two APKs, verified checksums and a non-sensitive release notice. No private rights worksheet or customer QA data is copied into the customer bundle. Existing release directories are never overwritten.

**Safety:** ZIP/upload/store distribution and production rollout are intentionally outside this script. For Play Store, it explicitly refuses an APK-only route; use the separate compliant AAB channel. The checksum comparison does not replace Android signature verification or legal rights review.

## Last-stage responsibilities (left for launch approval)

- Physical Android TV / web tests, pairing and live-media hardware proof
- Media/data rights and territorial clearance (seven categories)
- Approved privacy/support/terms/refund/billing pages and verified contact details
- Owner signing/upgrade/certificate continuity; Play Store AAB and disclosures if selected
- GitHub protected \`main\` and retirement of legacy automatic merge workflows
- Authorized merge, Cloudflare production version/health check and rollback plan

**Do not rate commercial launch 10/10 until these are verified.** Completing more code does not turn unknown rights or physical test results into PASS.
