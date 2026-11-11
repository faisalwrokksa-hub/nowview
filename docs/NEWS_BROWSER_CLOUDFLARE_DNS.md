# NewView News Browser & Cloudflare DNS filtering

Status: implemented in the development branch; **not yet validated on a physical Android TV or live Cloudflare production deployment**.

## Available News experience

Discover > Headlines has an enhanced remote-ready browser with:
- Article shortcuts and a custom HTTPS address field.
- BBC World, Reuters, Al Jazeera, Arab News, CNBC and Federal Reserve website launchers.
- Dedicated **Browse site** and **Focus headlines** buttons.
- Arrow Up/Down, Home, and End to move keyboard / TV remote focus through headline links; Enter opens the focused article.
- Native Android: an isolated `NewsBrowserActivity` built with WebView, address entry and Back/Forward/Reload/Close buttons, no NewView privileged JS bridge, HTTPS-only top-level navigation, no file access, no mixed content, Safe Browsing enabled on supported OS versions.
- Regular web: publisher websites open in a new browser tab (no iframe bypass of publisher restrictions).
- Six source-linked RSS options: Federal Reserve, SEC, Stocktwits (web only if source is available), BBC World, NPR and The Guardian. The native APK uses its own bounded direct RSS fetcher for Fed, SEC, BBC, NPR and Guardian.

Availability varies: publisher RSS servers can change endpoints, impose access limits or reject requests. When a feed is unavailable, use the **Browse site** option. NewView does not fabricate headlines or scrape an inaccessible page.

## Cloudflare DNS: what it can and cannot do

**Cloudflare 1.1.1.1 does not block advertising.** It is a normal public DNS resolver. DNS filtering does not remove same-domain video ads, paywalls, or first-party advertising. It may also break site content if blocked domains are required.

For DNS-based ad/tracker domain filtering, use a Cloudflare **Gateway** DNS location with explicitly configured policies (for example, selectively deny chosen ad/tracking hostnames). Configuring Gateway is a **Cloudflare account operation**, not something this APK can silently enable. Do not apply an unverified host list globally: misconfigured filters can break feeds and video playback.

Cloudflare documentation:
- Gateway DNS policies: https://developers.cloudflare.com/cloudflare-one/traffic-controls/dns-policies/
- Gateway DNS locations and endpoint choices: https://developers.cloudflare.com/cloudflare-one/traffic-controls/resolver-endpoints/
- Cloudflare 1.1.1.1 vs Gateway: https://developers.cloudflare.com/cloudflare-one/faq/general-faq/

### Recommended rollout

1. In the actual authorized Cloudflare Zero Trust account, create a DNS location for your network or device; configure the DNS-over-HTTPS or DNS-over-TLS endpoint according to your platform and Cloudflare's current docs.
2. Create a policy that blocks a small, reviewed list of advertising or tracking domains appropriate to the business. Start in monitoring mode where supported, inspect query logs, and keep allow exceptions for false positives.
3. Configure the **device or router** to use the provided Gateway resolver endpoint. On supported Android devices, use system Private DNS (DNS-over-TLS) or the official Cloudflare device client. Android TV availability and settings menus vary.
4. The **Open Android network / DNS settings** shortcut from NewView launches the system settings screen; it does not alter Android Private DNS for you. On browsers, follow device/router settings.
5. Test DNS resolution from the actual TV and browser. Check Gateway DNS logs for policy matches, and check that BBC, SEC, NPR, the Guardian, YouTube and chart feeds still function.
6. Record a rollback procedure to restore the original resolver quickly. Keep public DNS/Access/Gateway identity configurations separate from NewView's in-app article browsing.

The connected Cloudflare profile in this conversation does not have confirmed administrative access to the hosting account for this application, so **no Cloudflare DNS policy or resolver was changed**.

## Acceptance tests to perform on hardware

- Open Discover > Headlines using D-pad, switch feeds, focus a headline, Enter, browser Back/Forward/Reload/Close.
- A remote can enter HTTPS addresses and navigate article links; invalid HTTP, `file:`, `javascript:`, private IPs and nonstandard ports are refused.
- Browser news activity cannot call the dashboard's native JavaScript bridge.
- Confirm Cloudflare Gateway endpoint and filtering *actually* run at the OS/router level; disabled filtering should not affect browsing.
- Ensure the device supports third-party publisher sites and that the user understands site ads/paywalls can remain.
