import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const java=readFileSync(new URL('../android/src/dev/fintech/marketcharts/StreamPlayerActivity.java',import.meta.url),'utf8');
const manifest=readFileSync(new URL('../android/AndroidManifest.xml',import.meta.url),'utf8');

test('Android TV stream player has a bounded connection and buffering watchdog',()=>{
 assert.match(java,/PLAYBACK_TIMEOUT_MS=20000L/);
 assert.match(java,/mainHandler\.postDelayed\(task,PLAYBACK_TIMEOUT_MS\)/);
 assert.match(java,/MEDIA_INFO_BUFFERING_START/);
 assert.match(java,/MEDIA_INFO_BUFFERING_END/);
 assert.match(java,/MEDIA_INFO_VIDEO_RENDERING_START/);
 assert.match(java,/cancelWatchdog\(\)/);
 assert.match(java,/video\.setOnErrorListener/);
});

test('Native TV playback exposes D-pad focusable retry and safe lifecycle cleanup',()=>{
 assert.match(java,/retry=new Button\(this\)/);
 assert.match(java,/retry\.setOnClickListener\(v->startPlayback\(\)\)/);
 assert.match(java,/retry\.requestFocus\(\)/);
 assert.match(java,/video\.stopPlayback\(\)/);
 assert.match(java,/@Override protected void onPause\(\)/);
 assert.match(java,/@Override protected void onDestroy\(\)/);
 assert.match(java,/stopped=true/);
 assert.match(java,/KEYCODE_MEDIA_PLAY_PAUSE/);
});

test('Native player remains private and rejects unsafe URL schemes and hostnames',()=>{
 assert.match(manifest,/<activity android:name="\.StreamPlayerActivity" android:exported="false"/);
 assert.match(java,/"https"\.equalsIgnoreCase\(uri\.getScheme\(\)\)/);
 assert.match(java,/uri\.getUserInfo\(\)!=null\|\|uri\.getPort\(\)!=-1/);
 assert.match(java,/host\.equals\("localhost"\)/);
 assert.match(java,/host\.equals\("127\.0\.0\.1"\)/);
 assert.doesNotMatch(java,/setJavaScriptEnabled|addJavascriptInterface|http:\/\//i);
});
