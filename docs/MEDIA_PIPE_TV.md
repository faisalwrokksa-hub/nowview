# NewViewMedia: user-authorized PipeTv companion

The owner has authorized use of their PipeTv implementation. The public reference inspected was [LimitedIO/PipeTv](https://github.com/LimitedIO/PipeTv), with Android package `dev.limitedio.pipetv`.

**Delivered:** Android TV handoff to an already-installed PipeTv application through Android package manager, no new runtime or native video dependency. The hosted web interface offers a manually triggered official YouTube iframe and canonical source link, with video-ID URL validation. The embedded player can display advertisements. Local Android asset URLs use the PipeTv handoff instead of embedding.

**Rights:** PipeTv's public repository identifies GPL-3.0 and NewPipeExtractor dependencies. The user's authorship of some/all of the app does not necessarily override licenses of third-party dependencies. This integration does not copy, compile, relicense or distribute PipeTv code. A direct bundled player requires documented ownership, third-party obligations, and distribution-policy review. Its independently implemented ad-free behavior is not a guaranteed NewView functionality.

**Limitations:** Does not install or upgrade PipeTv, deep-link an exact video, extract streams, rebroadcast channels, or bypass advertising in YouTube's official player. Native package handoff and web embeds need real-device/browser testing and licensing review before release.

**QA:** Unit tests check URL validation and package-specific bridge; CI builds the APK. Test missing/installed PipeTv, switching/Back behavior, WebView, menu navigation, touch, and browser CSP on real devices before release.
