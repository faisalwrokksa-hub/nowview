# NewView publisher preview and full-site fallback

## Implemented
- On Android TV / APK, validated HTTPS destinations open at top-level in the **isolated native WebView**. It does not expose dashboard or launcher JavaScript bridges. Native main-frame network/HTTP failures display a retryable error.
- On the web, public HTTPS previews are shown only when an iframe might be supported. For known commonly non-embeddable publisher domains (Reuters, BBC, SEC, Federal Reserve, CNBC) the user sees **Open full website** immediately instead of an expected blank preview. A **Try website preview** action is still available.
- The YouTube homepage links to the full website; individual video links use the official YouTube embed, subject to video-owner restrictions and ads.
- Every web browsing page exposes **Open full website**, a real anchor with `rel="noopener noreferrer"`, and supports fullscreen NewView chrome. Bookmarks, Back/Forward, and safe URL restrictions remain intact.
- No proxying, iframe policy bypass, rewriting of publisher response headers, DNS changes, account credentials or external paid services.

## Important limitations
- A website's `frame-ancestors` / `X-Frame-Options` policies cannot be overridden by NewView web code. A cross-origin iframe's blank state cannot be detected reliably. A successful iframe `load` event **does not** prove that the publisher permitted rendering.
- The external tab must be opened by the user clicking a link; automatic popup attempts are not reliable.
- Websites may also restrict embedded native WebView clients by policy, login, DRM, regional availability, or unsupported codecs.
- Real-device verification is required for Android TV D-pad focus, navigation, publisher playback, error recovery and fullscreen.

## QA
- Run `node --test tests/youtube-viewer.test.mjs tests/news-browser.test.mjs`.
- Run `npm run verify` and Android APK CI build.
- On web, test Reuters, BBC, YouTube home and an embeddable public site. Ensure no frame is promised to work when blocked. Confirm **Open full website** opens a separate tab and bookmark history is preserved.
- On Android TV, open each site and test Back/Forward, Retry, navigation and no native bridge access. Record observations in `docs/RELEASE_ACCEPTANCE_MATRIX.md`.

## Release
A merge is not proof of hosting or acceptance. Verify Cloudflare credentials, deployment success and live smoke checks separately; owner-held APK signing and physical-device tests remain release gates.
