# NewView Phone Caster (Android) — native screen-to-TV sender

This **separate Android phone APK** sends consented phone-screen video over LAN WebRTC to the existing NewViewDevice TV floating screen viewer. It is an Android-native MediaProjection sender, **not** a web page pretending to capture an Android screen.

## Build/install

- GitHub Actions workflow: **NewView native Android phone caster**.
- Download artifact **NewView-Phone-Caster-test-APK** from the latest successful run on your branch. The signed production APK is **not yet released**; the uploaded APK is an unsigned-for-production, Android-debug-signed test build.
- Alternatively open `phone-caster/` in Android Studio and build/install `app:assembleDebug`.
- The existing NewView TV APK remains separately built by `build-apk.sh`. Install the phone sender on an Android **phone** (Android 8.0+), and the NewView TV/dashboard APK on the viewing device.

## Pair the phone to the TV

1. Connect the TV and phone to the **same local network**. LAN candidate gathering is used; no cloud relay, TURN server, or remote access is configured.
2. On NewView TV open **NewViewDevice** → **Watch another screen**. A manual connection offer appears.
3. Copy that JSON offer into **NewView Phone Cast** on the phone.
4. Press **Start screen sharing**. Android must show a system screen-capture permission prompt; accept only when you wish to share.
5. While capture runs, Android displays a persistent **NewView screen sharing is active** notification with a **Stop sharing** action.
6. Wait for **Connection answer** on the phone; copy the JSON answer to NewView TV's **Connection answer** field, then press **Finish viewer connection**.
7. The TV displays the Android phone screen as floating video; change its size to **⅓**, **½**, or **Full screen** or navigate to Markets.
8. Press **Stop sharing** inside the phone sender or its system notification, or revoke system screen-capture permission, to stop. Both peers close on normal termination. Sessions expire after **30 minutes** and require fresh consent.

## Privacy and constraints

- Captures **video only**, no microphone, no device audio, no automated recording, no remote-control channel.
- Never attempts capture before the native Android permission grant. A fresh MediaProjection permission is required for every session.
- The phone sender uses `ScreenCapturerAndroid` and `PeerConnection` from the open-source `io.github.webrtc-sdk:android:150.7871.01` dependency.
- Network candidates are LAN-only: no STUN/TURN configured. Some networks enforce client isolation, so a same-Wi-Fi connection may still fail. Manual codes may contain private IP addresses; share only with your own receiving device.
- Android limits or blackens protected content, so DRM-protected apps and secure surfaces may not appear.
- The foreground service stops with the sender's task. The user can also stop from the ongoing notification. No unattended capture starts on boot.
- **Acceptance still required:** install both builds on a real phone and TV, verify Android 14+ MediaProjection handling, orientation, audio exclusion, stopping via notification, session expiry, and reconnection. GitHub CI can validate compilation but not actual MediaProjection permission UX or network connectivity.

## For maintainers

```sh
gradle -p phone-caster :app:assembleDebug --no-daemon
```

Rebuild the TV separately with `bash build-apk.sh` as before. Android API target 34, compile SDK 35, source Java 17, minimum Android API 26. Current signaling is manual copy/paste. Future secure pairing would require independently audited authenticated signaling and session revocation, not silent LAN discovery.
