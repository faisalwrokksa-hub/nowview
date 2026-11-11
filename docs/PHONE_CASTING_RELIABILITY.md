# NewView Phone Caster — latest reliability enhancements

The Android phone-sender APK is a **development build**, intended to cast phone video to a NewView TV receiver using WebRTC with manual SDP offer/answer exchange over a local network. It does not provide automatic discovery, cloud relay, audio casting, or remote device control.

## User flow

1. Open **NewViewDevice → Watch another screen** on the TV and choose **Copy offer**.
2. Open the separately installed **NewView Phone Caster** APK on the Android phone, on the same reachable network.
3. Select **Paste TV offer from clipboard** if the offer was transferred to the phone clipboard; otherwise paste it into the entry box.
4. Tap **Start screen sharing** and explicitly approve Android screen-capture and notification permissions.
5. When a connection answer appears, select **Copy answer**, transfer it to the TV, and select **Finish viewer connection** on the TV.
6. Tap **Stop sharing** in the phone app or use its foreground notification's **Stop sharing** action.

## Implemented protections and recovery

- MediaProjection requires fresh Android user permission for every session.
- Visible foreground service/notification and explicit Stop control; maximum session duration is 30 minutes.
- Unpaired captures end automatically after 2 minutes, even if the phone is still showing a permission-approved capture.
- WebRTC disconnections get a 20-second recovery window and then close capture if they persist. An explicit failed/closed connection closes immediately.
- A one-tap paste option accepts at most 120,000 characters, rejects oversized text, and never saves peer offers or answers to app preferences.
- Capture dimensions follow actual phone aspect ratio up to 1,280 pixels on the longer dimension, change with orientation, and use 15 frames per second for moderate device load.
- Manual exchange and LAN-only ICE remain essential; Wi-Fi isolation, VPNs, and differing networks can block the connection.
- These code and build checks do **not** substitute for real Android phone-to-TV testing.

## Release criteria

The sender must pass `NewView native Android phone caster` and the existing dashboard/security CI. Test Android 13 and 14+ capture permission, notification Stop, rotating portrait/landscape, Wi-Fi interruption/recovery, privacy after activity termination, and actual video reception before a signed production release.

The development code is in draft PR #110. It has not been merged or deployed to the user's Cloudflare production project.
