# NewViewSocial — public social profile bookmarks

Initial free-first social functionality works **without third-party APIs, scraping or subscriptions**.

- Users can add up to 24 public profile URLs from X, TikTok and Facebook, view their saved list, open the original platform/profile, remove entries and clear all bookmarks.
- Strict URL allowlist: HTTPS only, expected platform hostnames, profile-only canonical paths, no query-string redirects or arbitrary external URLs. Only approved URLs are shown as links.
- The app uses plain text DOM operations and secure `target=_blank` links with `rel=noopener noreferrer`; it does not load third-party scripts, post bodies, profile metrics, thumbnails or user credentials.
- Saved links are local browser/Android WebView storage only. No account sync and no remote analytics.
- It does **not** claim to retrieve posts, follower counts, engagement or live social sentiment. Official social embeds and approved OAuth/feed APIs are future additions requiring platform-specific review.
- On Android TV, external links may be blocked by the current WebView navigation policy. Native external browser handoff would require an explicit URL allowlist and TV device validation; until then the bookmark management interface works, but opening the source may depend on the platform.
- Tests verify approved hosts, URL rejection, duplicate handling, asset packaging and absence of network scraper logic.

This is a functional foundation for NewViewSocial, not a full social intelligence API integration.
