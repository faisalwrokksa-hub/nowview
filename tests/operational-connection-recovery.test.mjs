import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('casting viewer bounds handshakes and clears timers on reset or connected media',()=>{
 const js=file('web/cast-overlay.js');
 assert.match(js,/connectionTimer=setTimeout\(\(\)=>\{/);
 assert.match(js,/30000\)/);
 assert.match(js,/if\(peer===activePeer&&activePeer\.connectionState!=='connected'\)/);
 assert.match(js,/if\(connectionTimer\)clearTimeout\(connectionTimer\);connectionTimer=null;/);
 assert.match(js,/if\(activePeer!==peer\)return/);
 assert.match(js,/same Wi-Fi, permissions, and exchange fresh codes/);
 assert.doesNotMatch(js,/iceServers:\[\{urls:\s*['"]stun:/);
});
test('TV native player resumes prior active video, not manually paused streams, and bounds recovery',()=>{
 const java=file('android/src/dev/fintech/marketcharts/StreamPlayerActivity.java');
 assert.match(java,/resumePlayback=video!=null&&video\.isPlaying\(\)/);
 assert.match(java,/@Override protected void onResume\(\)/);
 assert.match(java,/if\(!stopped&&resumePlayback&&video!=null/);
 assert.match(java,/armWatchdog\("Stream did not resume after returning to NewView\."\)/);
 assert.match(java,/catch\(RuntimeException e\)/);
 assert.match(java,/cancelWatchdog\(\);/);
});
