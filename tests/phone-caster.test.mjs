import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const activity=read('phone-caster/app/src/main/java/app/newview/phonecaster/CasterActivity.java');
const service=read('phone-caster/app/src/main/java/app/newview/phonecaster/ProjectionNoticeService.java');
const manifest=read('phone-caster/app/src/main/AndroidManifest.xml');
const gradle=read('phone-caster/app/build.gradle');
const tv=read('web/cast-overlay.js');
test('native sender requires explicit Android screen-share permission per session',()=>{
 assert.match(activity,/createScreenCaptureIntent\(\)/);
 assert.match(activity,/startActivityForResult\(manager\.createScreenCaptureIntent\(\),CAPTURE_REQUEST\)/);
 assert.match(activity,/resultCode!=RESULT_OK\|\|data==null/);
 assert.match(activity,/new ScreenCapturerAndroid\(permission/);
 assert.match(activity,/private void stopCasting\(\)/);
 assert.match(activity,/previous\.stopCapture\(\)/);
 assert.match(activity,/onDestroy\(\)/);
 assert.doesNotMatch(activity,/MediaRecorder|AccessibilityService|READ_MEDIA_IMAGES|WRITE_EXTERNAL_STORAGE/);
});
test('foreground service notification and stop button terminate active capture',()=>{
 assert.match(manifest,/FOREGROUND_SERVICE_MEDIA_PROJECTION/);
 assert.match(manifest,/android:foregroundServiceType="mediaProjection"/);
 assert.match(manifest,/android:exported="false"/);
 assert.match(service,/startForeground\(ID,notice,ServiceInfo\.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION\)/);
 assert.match(service,/CasterActivity\.stopActiveCapture\(\)/);
 assert.match(service,/Stop sharing/);
 assert.match(activity,/stopService\(new Intent\(this,ProjectionNoticeService\.class\)\)/);
});
test('phone-to-TV casting uses WebRTC video only and interoperable manual SDP',()=>{
 assert.match(activity,/new PeerConnection\.RTCConfiguration\(Collections\.emptyList\(\)\)/);
 assert.match(activity,/sdp\.contains\("m=application "\)/);
 assert.match(activity,/createAnswer\(new SdpObserver/);
 assert.match(activity,/json\.put\("type","answer"\)/);
 assert.match(activity,/json\.put\("sdp",peer\.getLocalDescription\(\)\.description\)/);
 assert.match(tv,/parseSignal\(answer\.value,'answer'\)/);
 assert.match(activity,/MAX_SESSION_MS=30\*60\*1000L/);
 assert.match(activity,/handler\.postDelayed\(expire,MAX_SESSION_MS\)/);
 assert.doesNotMatch(activity,/createDataChannel|addAudioTrack|requestAudioFocus|AudioCapturer/);
});
test('separate source-based Android phone caster uses maintained WebRTC dependency',()=>{
 assert.match(gradle,/io\.github\.webrtc-sdk:android:150\.7871\.01/);
 assert.match(manifest,/app\.newview\.phonecaster\.START|\.CasterActivity/);
});

test('Android 13+ requires the visible stop-sharing notification before projection',()=>{
 assert.match(activity,/POST_NOTIFICATIONS/);
 assert.match(activity,/requestPermissions\(new String\[\]\{android\.Manifest\.permission\.POST_NOTIFICATIONS\},NOTICE_REQUEST\)/);
 assert.match(activity,/onRequestPermissionsResult\(int requestCode/);
});

test('safety: casting stops if TV never connects, and tolerates short Wi-Fi interruptions',()=>{
 assert.match(activity,/CONNECT_TIMEOUT_MS=120000L/);
 assert.match(activity,/DISCONNECT_GRACE_MS=20000L/);
 assert.match(activity,/handler\.postDelayed\(connectTimeout,CONNECT_TIMEOUT_MS\)/);
 assert.match(activity,/handler\.postDelayed\(disconnectTimeout,DISCONNECT_GRACE_MS\)/);
 assert.match(activity,/handler\.removeCallbacks\(connectTimeout\)/);
 assert.match(activity,/handler\.removeCallbacks\(disconnectTimeout\)/);
 assert.match(activity,/connected=true/);
});
test('phone pairing can paste a bounded offer and keeps projection alive when rotated',()=>{
 assert.match(activity,/Paste TV offer from clipboard/);
 assert.match(activity,/value\.length\(\)>120000/);
 assert.match(manifest,/android:configChanges="orientation\|screenSize\|keyboardHidden"/);
});
