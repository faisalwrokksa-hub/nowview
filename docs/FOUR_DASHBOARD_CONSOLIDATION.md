# NewView dashboard consolidation — 2026-11-11

Status: implemented in the **development PR**, not merged or deployed.

## Four primary navigation destinations

| Main tab | Features | Former locations |
|---|---|---|
| **MyView** | Personalized widgets, shortcuts, **Power BI reporting portal** | MyView + Business |
| **Markets** | Chart and market-data tools, indicators, watchlists, floating video viewer | Markets |
| **Discover** | Official headlines, IPTV channel directory, official video embeds, **social bookmarks** | Watch & News + Social |
| **NewViewDevice** | Encrypted layout-pairing prototype and consent-based browser-to-browser screen-share demo | NewViewDevice |

## Compatibility and preservation

- The original `business` and `social` HTML sections are *relocated* to their new parent workspace on startup, preserving existing DOM handlers and local-storage preferences.
- Public JS `NewViewShell.select('business')` routes to MyView's Power BI portal and scrolls it into view; `select('social')` routes to Discover > Social; `select('news')` routes to Discover.
- Saved `newview.workspace` values and TV display-profile workspace lists are mapped to current primary routes; legacy `business` => `myview`, `news` / `social` => `media`.
- Social bookmarks and media feeds stay in their existing script modules; device screen viewer remains hosted on `document.body` across navigation.
- Power BI opens only on Microsoft's authorized website, not inside an untrusted iframe. Legacy CSV parser remains in repository for compatibility but is not the main Business user interface.

## Follow-up quality gates

- Verify the four primary tabs and `Discover` sub-tab keyboard navigation on web and physical Android TV.
- Test saved legacy routes, existing bookmarked views, TV remote focus, and the automatic relocation of social/Power BI DOM content.
- Complete current GitHub CI checks and avoid production changes until a verified release. Do not report the feature as deployed.
- Production Cloudflare access and authenticated multi-device casting remain separate release blockers.
