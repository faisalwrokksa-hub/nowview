# NewView floating screen cast — user guide and integration boundaries

Status: **development branch only**. This feature is an experimental browser-to-browser WebRTC video overlay, not native phone casting, automatic cloud device pairing, or account-signed-in mirroring.

## What changed

- `web/cast-overlay.js`: a floating, resizable, draggable video window hosted on `document.body` (not within a workspace page). It continues to display an attached stream when you switch to Markets, Business, Watch & News, Social, or MyView.
- A **Screen cast** button in the dashboard header; click it to open NewViewDevice connection controls.
- A NewViewDevice section with watch/share actions, copyable offer and answer codes, explicit Stop, and **Open Markets with floating screen**.
- Video playback, minimize, resize, drag the window by its title bar, fullscreen, and stop/close actions.
- Browser-to-browser video only: no audio, recording, unattended access, camera access, device remote control or data channels.

## Try it (supported desktop browsers on the same Wi-Fi)

1. Use a secure HTTPS NewView deployment with the cast feature (or secure localhost). Open NewViewDevice on the **receiving** PC/browser, click **1 · Watch another screen**, then **Copy offer**.
2. Open NewViewDevice on the **sending** supported desktop browser. Paste the viewer's offer into **Connection offer**, then click **2 · Share this screen**. The browser asks for screen/window selection and permission. Declining sends nothing.
3. Sender: click **Copy answer**; privately transfer that code back to the receiver.
4. Receiver: paste the answer into **Connection answer**, then click **Finish viewer connection**.
5. After the stream connects, click **Open Markets with floating screen**; the market chart stays interactive under the floating viewer. Drag, resize, minimize or fullscreen the viewer.
6. Click **Stop sharing** or use the browser's built-in stop-sharing control to end the capture.

**Important:** Manual SDP codes can disclose local-network ICE candidate information. Exchange them only with your own trusted devices. This prototype does not run STUN/TURN or cloud signaling; even on the same Wi-Fi, local network configuration may prevent the connection. Browser screen capture APIs usually cannot capture the entire Android/iPhone screen from within a mobile browser.

## About `phone-main.zip`

The uploaded source contains `agent/webrtc_stream.py`, an optional `aiortc`-based streaming bridge reading an **already-authorized** Android device through ADB on a host PC. Its own `docs/WEBRTC-v0.7.md` describes video-only host-assisted screen streaming and explicitly states that live hardware validation is not complete. This source is not linked to the above browser-to-browser demo yet.

A future native Android sender must use normal Android MediaProjection with foreground notification and per-session permission, or an explicitly approved ADB bridge on a trusted host. Before production, add authenticated signaling and a TURN server if off-LAN support is required, review license/dependencies, device revocation, end-to-end stream lifecycle, reconnection, security tests and Android release signing.

## Deployment

- The cast UI builds as part of `cloud/build.mjs` through `web/cast-overlay.js`.
- The existing Workers account remains inaccessible through the connected Cloudflare app (HTTP 403); building and committing on GitHub does **not** prove live deployment.
- Cloud device *layout* sync and its KV binding are a separate feature. The floating video player does not require that KV binding; the initial manual SDP demo is peer-to-peer.
- Live physical-device interoperability, browser capture behavior, remote audio, and connection reliability are not yet verified.
