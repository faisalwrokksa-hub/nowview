# NowViewNews — official RSS integration (first prototype)

The official financial announcements connector uses allowlisted RSS sources:
- Federal Reserve public news feed: https://www.federalreserve.gov/feeds/press_all.xml
- U.S. Securities and Exchange Commission press releases feed: https://www.sec.gov/news/pressreleases.rss

These are **source-linked announcements**, not a general world-news feed, and not a license to repackage publishers' full articles.

## Integration and constraints
- On the hosted web worker, `GET /api/news?source=fed|sec` fetches only preapproved HTTPS feed endpoints and rejects redirects. The client displays plaintext titles (not trusted HTML), publisher attribution, dates and hyperlinks to the publisher's official domain.
- Each response has a strict 512 KiB download cap, nine-second source timeout and twelve headline maximum. No third-party API keys, external scraping services or arbitrary user-supplied fetch URLs.
- The endpoint does not store copies or transmit complete stories. It may be blocked by the origin's bot controls, rate limits or regional restrictions and will show a clear error rather than fake headlines.
- Direct file-backed Android TV assets do not serve a `/api/news` endpoint. The TV shows a source link until a safe, explicitly configured backend integration is introduced; the existing Binance market feed remains independent.
- This integration is **not deployed**. Functional outbound network compatibility and individual rights policies must be verified before commercial launch.
- Tests cover parsing, allowlisting, malicious URLs, oversized response content and safe rendering through `textContent`.
