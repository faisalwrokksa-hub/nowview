# MyNewView — flexible screens and universal floating video

Implemented in development branch, not merged or production-verified.

## Screen layouts

MyView offers **1**, **2**, or **3** screen/panel modes. Selecting a mode reflows personalized cards into the chosen number of columns on wide screens. On small or TV-constrained viewports, the layout stacks for legibility and remote focus. Navigation shortcut panels for Markets, News/Discover, and MyView are also shown in multi-screen mode.

These are logical dashboard panels **within one display**. They do not create or detect physical HDMI displays, cast to multiple hardware screens, or launch additional operating-system windows. The same app's global shell and floating viewer remain available across the dashboard.

## Persistent floating video

- Size controls: **⅓ screen**, **½ screen** and **Full screen**. Selected size is stored on the device and survives navigation.
- Sources: consent-based browser screen sharing (manual WebRTC codes), **official YouTube embedded video** on compatible web browsers, and **HTTPS HLS / MP4 IPTV stream** where the browser supports that format.
- Media source actions appear inside Discover > Videos (Float YouTube) and Discover > Live TV (Float selected IPTV).
- Floating video is independent of the current workspace. It can be dragged, docked left/right, minimized, closed, stopped and resized. It does not capture the underlying app or run any invisible recording.
- YouTube embeds use `www.youtube-nocookie.com`. Video advertising, broadcaster restrictions and region limitations can still apply; no bypasses are used.
- Native Android APK does **not** embed YouTube in the floating WebView. Use official YouTube browser links or the separately installed PipeTv application. Native Android IPTV support may vary.
- Browser playback of an IPTV stream is not proof of channel availability, licensing, or format support; failed playback should be reported honestly. 
- Browser-to-browser screen casting requires explicit permission, manual offer/answer exchange, compatible devices, and connectivity. **Native Android MediaProjection capture, cloud WebRTC signaling, remote device control, TURN and automatic pairing are not implemented.**

## Using it

1. Open **MyView** and select 1, 2 or 3 screens.
2. Choose floating size ⅓, ½ or Full, or adjust size directly on the dock.
3. Open **Discover → Videos** and enter a supported YouTube URL; use **Float YouTube**.
4. Alternatively open **Discover → Live TV**, select a listed HTTPS HLS/MP4 channel and choose **Float selected IPTV**.
5. To view another PC/browser screen, use **NewViewDevice → Watch another screen** and exchange manually generated connection codes with a screen-sharing browser on the same local network. Capture permission is mandatory.
6. Switch to **Markets** and keep the floating media visible. Click Stop or Close to release video/capture.

## Verification and release gates

Review automated GitHub tests for layout control, URL validation and media docking. Still required: actual browser playback tests across engines, Android TV remote focus, physical-device screen capture testing, authorized Cloudflare cloud services and production deployment. No production changes have been made by these commits.
