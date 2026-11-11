import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const viewer=read('web/cast-overlay.js'),html=read('web/index.html'),css=read('web/command-center.css'),shell=read('web/workspace-shell.js');
test('floating cast viewer is bundled once and remains separate from workspace panels',()=>{
 assert.equal((html.match(/src="cast-overlay\.js"/g)||[]).length,1);
 assert.match(viewer,/document\.body\.append\(dock\)/);
 assert.match(viewer,/window\.NewViewShell\?\.select\('markets'\)/);
 assert.match(css,/position:fixed/);
 assert.match(css,/newview-cast-dock\.is-minimized/);
 assert.match(css,/resize:both/);
});
test('viewer offers consent-based video only, never silently captures devices',()=>{
 assert.match(viewer,/send\.addEventListener\('click',async/);
 assert.match(viewer,/navigator\.mediaDevices\.getDisplayMedia/);
 assert.match(viewer,/video:true,audio:false/);
 assert.match(viewer,/getVideoTracks\(\)\[0\]\?\.addEventListener\('ended',reset/);
 assert.match(viewer,/localCapture\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
 assert.match(viewer,/new RTCPeerConnection\(\{iceServers:\[\]\}\)/);
 assert.match(viewer,/m=application /);
 assert.doesNotMatch(viewer,/getUserMedia|MediaRecorder|sendDataChannel|createDataChannel/);
});
test('manual SDP exchange validates video and bounds code size before capture',()=>{
 assert.match(viewer,/const MAX_SIGNAL=120000/);
 assert.match(viewer,/parseSignal\(offer\.value,'offer'\)/);
 assert.match(viewer,/parseSignal\(answer\.value,'answer'\)/);
 assert.match(viewer,/Paste a valid viewer offer before starting screen capture/);
 assert.match(viewer,/if\(!data\|\|data\.type!==type/);
 assert.match(viewer,/waitIce\(pc\)/);
});
test('four primary workspaces and device pairing remain intact',()=>{
 assert.match(html,/data-view-button="devices"/);
 assert.match(html,/id="newview-device-controls"/);
 assert.match(shell,/const views=\['myview','markets','media','devices'\]/);
 assert.match(css,/body:not\(\.home-panel\) \.newview-cast-trigger/);
});
test('cast UI source parses without syntax errors',()=>{assert.doesNotThrow(()=>new Function(viewer));});

test('floating viewer can be moved aside without navigating away from Markets',()=>{
 assert.match(viewer,/top\.addEventListener\('pointerdown'/);
 assert.match(viewer,/top\.addEventListener\('pointermove'/);
 assert.match(viewer,/dock\.style\.left=left\+'px'/);
 assert.match(viewer,/document\.body\.append\(dock\)/);
 assert.match(css,/\.newview-cast-bar\{cursor:grab/);
});
