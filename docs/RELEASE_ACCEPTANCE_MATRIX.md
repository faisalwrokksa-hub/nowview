# NewView — Release Acceptance Matrix

**Status:** Owner/hardware execution required. Passing CI and producing test APKs do not establish production readiness.

## Evidence rules
For each test record: device model, Android version, APK SHA-256, build commit, date, tester, expected result, observed result, PASS/FAIL/BLOCKED, and issue link. Do not record PASS without real execution. Never paste pairing secrets, keystores, account tokens or personal data into issues.

## Android TV hardware matrix

| ID | Scenario | Acceptance criteria | Status |
|---|---|---|---|
| TV-01 | Clean install of both test APK variants | Installs and opens without crashes | NOT RUN |
| TV-02 | Remote arrows and Select | All visible controls reachable; no focus traps | NOT RUN |
| TV-03 | Back from player, browser, settings, modal | Returns to previous safe view; no accidental exit | NOT RUN |
| TV-04 | Home shortcuts 1, 2, 3, 4 | Saved count and order survive restart | NOT RUN |
| TV-05 | Preference export/import | Restored layout matches validated JSON | NOT RUN |
| TV-06 | IPTV valid public HTTPS stream | Plays only where broadcaster/codec allows; truthful failures | NOT RUN |
| TV-07 | IPTV unavailable/invalid stream | Clear error and retry, no frozen player | NOT RUN |
| TV-08 | YouTube official playback | Allowed embed/native handoff or clear external-browser fallback; no ad-bypass claim | NOT RUN |
| TV-09 | Offline/online transition | Offline states shown; sources recover on reconnection | NOT RUN |
| TV-10 | Background/resume and sleep/wake | Playback lifecycle and remote navigation recover | NOT RUN |
| TV-11 | Extended viewing/memory | No uncontrolled memory growth or severe degradation | NOT RUN |
| TV-12 | Device sync pairing/conflict/revocation | Authorized encrypted layouts only; revocation works | NOT RUN |

## Browser and responsive matrix

| ID | Scenario | Acceptance criteria | Status |
|---|---|---|---|
| WEB-01 | Desktop Chromium and Firefox | Main navigation, charts, Read/Watch and Customize work | NOT RUN |
| WEB-02 | Mobile 390px and tablet 768px | No clipped essential controls or horizontal overflow | NOT RUN |
| WEB-03 | Desktop 1440px and TV 1920px | Focus and layout remain usable | NOT RUN |
| WEB-04 | Keyboard only | All actions reachable, visible focus and usable Escape | NOT RUN |
| WEB-05 | Reduced motion/high contrast | Settings persist and controls remain legible | NOT RUN |
| WEB-06 | Empty/error/stale market/news feeds | Truthful status, attribution, retry and no invented data | NOT RUN |
| WEB-07 | Corrupted local preferences | Safe defaults without crash | NOT RUN |
| WEB-08 | Imported preferences validation | Reject malformed/oversized data and unsafe values | NOT RUN |

## Production gates
- [ ] CI green on the **release commit**; verify all six workflow conclusions.
- [ ] Record successful TV and web matrix evidence; resolve all P0/P1 failures.
- [ ] Audit media playback rights, sources, third-party licenses, privacy and data attribution.
- [ ] Review sync authorization, deep-link handling and WebView bridge security.
- [ ] Production-sign with **owner-held keys only**; verify APK signing certificate, versionCode and upgrade path.
- [ ] Test upgrade from previous owner-signed release and rollback/recovery.
- [ ] Confirm support contact, customer-facing policies, and release approval.
- [ ] Release owner signs off explicitly before public distribution.

## Automated evidence check

Record results as a JSON array using the fields below (camelCase: `buildCommit`, `apkSha256`, `result`, `device`, `expected`, `observed`, `tester`, `date`, `evidence`). Run `node tools/check-release-evidence.mjs path/to/evidence.json` locally. The checker fails closed on missing tests, duplicates, malformed PASS records, and missing device/build evidence. It does **not** validate that submitted observations are truthful; human review and all production gates remain mandatory. Never commit private pairing links or keys.

## Start a device QA session

Run `node tools/create-qa-worksheet.mjs` to create a **local** `newview-qa-evidence.local.json` with all 20 scenarios marked `NOT RUN` and all release gates false. The generator refuses to overwrite existing evidence. Record observed results only after testing. Then run `node tools/release-readiness-report.mjs newview-qa-evidence.local.json` to see the remaining NO-GO items. Do not commit device identifiers, pairing details, user data or private evidence files.

## Consolidated readiness report

After recording evidence, create a local JSON object with `records` (the evidence array) and `gates` (booleans: `ci`, `mediaRights`, `securityReview`, `signing`, `upgradeTest`, `supportPolicy`, `ownerApproval`). Run `node tools/release-readiness-report.mjs readiness.json report.md`. Every omitted gate is UNVERIFIED and the report is NO-GO by default. A generated report does not replace real verification or authorize distribution.

## Evidence template
```text
Test ID:
Device / OS / browser:
Build commit:
APK SHA-256 (if applicable):
Expected:
Observed:
Result: PASS / FAIL / BLOCKED
Evidence link:
Issue link:
Tester and date:
```

The latest passing CI run and APK artifacts may be linked as **build evidence**, never as hardware test evidence.
