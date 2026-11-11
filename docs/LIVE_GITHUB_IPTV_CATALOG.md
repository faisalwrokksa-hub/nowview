# NewView — Online GitHub IPTV discovery

## What is included

NewView now discovers public IPTV listings from the **maintained [IPTV-org project](https://github.com/iptv-org/iptv)**, not a stale hardcoded playlist or an unrestricted search of arbitrary GitHub repositories.

- `https://iptv-org.github.io/iptv/index.m3u` — the latest main public channel playlist.
- `https://iptv-org.github.io/api/countries.json` — current supported country choices.
- `https://iptv-org.github.io/api/languages.json` — current supported language choices.
- `https://iptv-org.github.io/api/categories.json` — current supported category choices.
- When a country, language, or category is selected, NewView constructs only the corresponding approved `iptv-org.github.io/iptv/{countries|languages|categories}/CODE.m3u` URL. It never builds arbitrary URLs from GitHub search results.

**In Discover → Live TV**, choose **All public channels**, **Country**, **Language**, or **Category**. Search within the loaded playlist and select a channel; use the inline player, the floating IPTV dock where the browser supports HTTPS HLS/MP4, or the native Android player. The UI initially displays up to 1,500 matches for performance but searches the full loaded playlist before that display limit.

## Refresh and newly listed channels

- On startup NewView fetches the latest selected public playlist online.
- While the application is running and visible, it requests playlist and source metadata updates every **3 hours** through the Source Monitor.
- **Refresh channels** forces a fresh request for the selected playlist and the country/language/category list, bypassing the 3-hour client cache.
- NewView compares refreshed stream URLs with the previous loaded version of the same playlist. Newly listed URLs create a **MyView Source Monitor** update and are clearly tagged as *listed but not playback-verified*.
- Failed IPTV streams are hidden by default **only after a confirmed failure**; unknown streams remain visible. Playback success restores a stream; timeouts and unsupported autoplay do not count as proof the stream is dead.
- Online checks are paused while the browser is closed/hidden/offline. This is **not** a continuously operating server-side monitoring job. NewView does not automatically check every channel's video playback; that would be expensive, error-prone and potentially violate upstream limits.

## Security, usage and licensing

Only maintained, approved IPTV-org hostnames are fetched for directory metadata and playlists. Catalog codes are validated, network requests are timed out and size-bounded, untrusted playlist HTML is never interpolated into the interface, and Android's native bridge constructs URLs from recognized scope identifiers without accepting arbitrary endpoints. Stream links may still redirect, expire, geo-block or require different player capabilities. Listing is not proof of licensing or distribution rights; use only sources you are authorized to view.

The external IPTV catalog may add and remove entries at any time. The app does **not** automatically ingest every GitHub IPTV repository, redistribute streams, bypass DRM, or guarantee uninterrupted playback. YouTube sources and news RSS providers are separate integrations.

## Release validation needed

The code and tests are committed to the development branch; GitHub CI verifies build and source-level regressions. Before release, verify external catalog CORS on the live Cloudflare domain, TV remote selection, Android native catalog callbacks, and real IPTV streams on physical hardware. The draft pull request must be reviewed and merged separately.
