# NewView Source Registry

The canonical inventory is [config/source-registry.json](../config/source-registry.json).

This is a **reference catalog**, not a list of enabled feeds. Do not infer that a source is licensed, accessible, tested, or supported simply because it is listed.

## Source lifecycle

- `planned`: reference for future development; no runtime calls.
- `partial`: some code exists; verify full Android TV behavior.
- `implemented`: existing integration; still subject to release QA.
- `restricted`: provider key, subscription, approval, commercial licensing, or platform limitations must be resolved first.

## Integration requirements

1. Review the provider's current API, rate limits, caching policy, attribution and commercial reuse permissions.
2. Verify the canonical endpoint and whether anonymous use is allowed.
3. For IPTV, independently verify stream rights, compatibility, availability, and EPG metadata. IPTV-org indexing is not redistribution authorization.
4. Never put private API secrets in an APK. Use public endpoints or user-provided credentials stored securely where supported.
5. Enforce HTTPS for remote feeds, strict host allowlists, response size/time limits, XML/JSON validation and bounded retries.
6. Display the source and timestamp. Mark stale/offline data clearly; never invent market quotes or headlines.
7. Test each source on Android TV, including D-pad navigation, failures, and no-network startup.
8. Only change a source to `implemented` after code review and appropriate test evidence; release readiness is tracked separately.

## Dashboard ownership

- MyView: favorites and widgets sourced from the other dashboards.
- Markets: exchange market data, macro releases, financial headlines, authorized business channels.
- Business: local CSV, economic APIs, business RSS and authorized business channels.
- News: publisher RSS, public alerts, news discovery and authorized live news.
- Media: IPTV directory, approved streams, EPG, official video embeds and user-provided authorized playlists.
- Social: public API content and official platform links/embeds.

The source registry must not be treated as a runtime allowlist or as authorization to fetch restricted services.
