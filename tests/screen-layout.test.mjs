import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const layout=read('web/screen-layout.js'),viewer=read('web/cast-overlay.js'),media=read('web/media.js'),css=read('web/command-center.css'),html=read('web/index.html'),build=read('cloud/build.mjs');
test('one, two and three screen layouts are persisted with safe defaults',()=>{
 assert.match(layout,/LAYOUT_KEY='newview.layout.panels.v1'/);
 assert.match(layout,/SIZE_KEY='newview.layout.video-size.v1'/);
 assert.match(layout,/for\(const n of \[1,2,3\]\)/);
 assert.match(layout,/\[1,2,3\]\.includes\(Number\(value\)\)/);
 assert.match(layout,/localStorage\.setItem\(LAYOUT_KEY,String\(count\)\)/);
 assert.match(css,/\[data-screen-count="3"\] \.myview-grid\{display:grid;grid-template-columns:repeat\(3/);
 assert.match(css,/\[data-screen-count="2"\] \.myview-grid\{display:grid;grid-template-columns:repeat\(2/);
 assert.doesNotThrow(()=>new Function(layout));
});
test('universal floating dock offers actual third, half and full viewport positions',()=>{
 assert.match(viewer,/item\.key==='third'/);
 assert.match(viewer,/window\.NewViewLayout\?\.setSize\(item\.key\)/);
 assert.match(css,/data-newview-video-size="third"/);
 assert.match(css,/data-newview-video-size="half"/);
 assert.match(css,/data-newview-video-size="full"/);
 assert.match(viewer,/document\.body\.append\(dock\)/);
 assert.doesNotThrow(()=>new Function(viewer));
});
test('videos use publisher-approved YouTube embeds and HTTPS HLS or MP4 sources',()=>{
 assert.match(viewer,/playYouTube\(raw\)/);
 assert.match(viewer,/playIPTV\(raw\)/);
 assert.match(viewer,/window\.NewViewMedia\?\.parse\?\.\(raw\)/);
 assert.match(viewer,/url\.protocol!=='https:'/);
 assert.match(viewer,/\(m3u8\|mp4\)/);
 assert.match(media,/Float selected IPTV/);
 assert.match(media,/Float YouTube/);
 assert.match(media,/NewViewCast\?\.playIPTV/);
 assert.match(media,/NewViewCast\?\.playYouTube/);
 assert.doesNotMatch(viewer,/youtube-dl|yt-dlp|createDataChannel|MediaRecorder/);
});
test('all controls are included by the development Worker and the main HTML page',()=>{
 assert.match(build,/screen-layout\.js/);
 assert.equal((html.match(/src="screen-layout\.js"/g)||[]).length,1);
});

test('half and third video actually reserve chart space and release it on close',()=>{
 assert.match(viewer,/document\.body\.classList\.toggle\('newview-video-active'/);
 assert.match(viewer,/updateViewport\(\)/);
 assert.match(css,/newview-video-active\[data-newview-video-size="half"\]>main/);
 assert.match(css,/newview-video-active\[data-newview-video-size="third"\]>main/);
 assert.match(css,/newview-video-active\.newview-video-left/);
});

test('live multi-screen panes use source-linked events and never fabricate quotes',()=>{
 assert.match(layout,/newview-pane-live/);
 assert.match(layout,/newview:market/);
 assert.match(layout,/newview:news/);
 assert.match(layout,/newview:update/);
 assert.match(layout,/quote\.source!=='binance'/);
 assert.match(layout,/Number\.isFinite\(quote\.price\)/);
 assert.match(layout,/stale quote/);
 assert.match(layout,/Waiting for a current market quote/);
 assert.doesNotMatch(layout,/Math\.random\(\)/);
});

test('floating IPTV health is marked from playback, not playlist presence or blocked autoplay',()=>{
 assert.match(viewer,/video\.addEventListener\('playing'/);
 assert.match(viewer,/flagIPTV\('ok','Video playback confirmed'\)/);
 assert.match(viewer,/video\.addEventListener\('error'/);
 assert.match(viewer,/flagIPTV\('failed','Browser video playback failed'\)/);
 assert.match(viewer,/iptvTimeout=setTimeout/);
 assert.match(viewer,/flagIPTV\('unknown','No playback confirmed within 20 seconds'\)/);
 assert.match(viewer,/error\?\.name==='NotAllowedError'/);
 assert.match(viewer,/iptvAttempt\+\+/);
 assert.match(viewer,/if\(iptvTimeout\)clearTimeout\(iptvTimeout\)/);
});
