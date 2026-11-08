# NewView — cross-workspace static QA, November 2026

Reviewed all six existing workspaces in the private review branch.

## Fixes included
- Spatial arrow-key navigation skips disabled and hidden widgets/controls, including off-screen workspaces; it navigates both buttons and actual links. Native input/select/textarea arrow keys are not intercepted.
- Stock board/full chart action is only visible in NewViewMarkets and remains available outside the chart panel.
- Navigating away from NewViewMedia removes the YouTube iframe source to stop playing audio/video in the background.
- Workspace tabs receive a consistent current-page state for accessibility; switching views scrolls the selected view back to the top.
- Narrow viewport styling improves vertical scrolling and touch target size without changing the existing dark-green/gold theme.

## Automated checks
- Existing Node, Python and Android APK build CI is preserved.
- New regression tests validate navigation and workspace invariants.
- GitHub CI completion proves build and unit tests only. No emulator screenshots, actual Android TV remote tests, media device behavior or screen-reader audits are claimed.

## Open device-specific issues
- Physical Android TV focus path across file picker, iframe, social URLs and externally launched PipeTv.
- Android WebView currently blocks external URLs; source links may need a separately audited restricted external-intent bridge.
- Android TV CSV file picker may depend on availability of a document provider.
- Real mobile small viewport testing, localized input and media playback conditions.
- Commercial legal/platform review and signing before release.

No deployment, production merge, new API fees or external service credentials were used.
