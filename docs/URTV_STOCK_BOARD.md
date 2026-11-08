# NowView Market Board — UrTV-style display

**Reference:** [tshi-dev/UrTV](https://github.com/tshi-dev/UrTV), specifically the source `src/template.html` stock-watchlist presentation. The supplied `releases/tag/apk-latest` URL is the compiled APK release, not its source tree.

**Implementation:** An independent NowView implementation of the same *presentation pattern*, not a source-code transplant. UrTV has no root LICENSE/COPYING file verified in our review. No UrTV fonts, photographs, artwork, templates, parsing code or API clients were imported.

## Visual behavior
- Preserves UrTV's high-level compact watchlist layout: stock label, exchange code/ticker, miniature trend line, numerical price and green/red arrow/percentage change.
- The Saudi section is right-to-left with concise Arabic names; the U.S. section uses English and LTR.
- Dark translucent cards and restrained gold headings for TV legibility, without bundled external image/font assets.
- `Stock board` toggles the board; `Full chart` returns to NowView's existing detailed chart.
- Touch/mobile responsiveness and the TV remote's existing focus handling are preserved.

## Market data limits (essential)
- **Saudi and U.S. stock prices are deliberately unavailable**: NowView currently does **not** integrate a licensed Tadawul/SIP/U.S. stock feed. The board shows `—` and `Feed not connected` rather than fabricated or unauthorized quotes.
- The Binance section may display only NowView's **currently selected and verified** Binance Spot instrument, in **USDT**, with source age and staleness; it never mislabels tokenized equity as the underlying U.S. stock.
- Before enabling real Saudi and U.S. price rows, create an approved adapter including provider terms, instrument IDs, currencies, exchange/holiday calendars, quote delay and last-update metadata. Validate commercial rights.
- Display of a historical price or quote does not imply a live exchange session.

## Validation
- Run `node --test tests/stock-board.test.mjs`, the complete Node/Python suites and the Android CI APK build.
- Manual TV QA: verify toggling board/full chart, 1080p and 720p, D-pad focus, price truncation, right-to-left text, resizing, offline/stale cases, and TV Home compact overlay unchanged.
- Not yet real-device tested or legally cleared for UrTV source reuse; design is independently implemented.
