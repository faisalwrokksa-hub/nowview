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
