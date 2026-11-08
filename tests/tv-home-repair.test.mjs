import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const channels=require('../web/channel-filters.js');
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('quoted M3U commas do not truncate the channel title',()=>{
 const input='#EXTM3U\n#EXTINF:-1 tvg-id="test" group-title="News, International",Global News HD\nhttps://example.org/stream.m3u8\n';
 const parsed=channels.parseM3U(input);
 assert.equal(parsed.length,1);
 assert.equal(parsed[0].name,'Global News HD');
 assert.equal(parsed[0].category,'news, international');
});
test('Android TV Home remains an in-app layout without overlay dependency',()=>{
 const html=read('../web/index.html'),home=read('../web/tv-home.js'),shell=read('../web/workspace-shell.js');
 assert.match(html,/tv-home\.js/);
 assert.match(home,/MR7 TV/);
 assert.match(home,/NewPipe/);
 assert.match(home,/All apps/);
 assert.match(shell,/tv-launcher/);
 assert.doesNotMatch(home,/HomePanelService|SYSTEM_ALERT_WINDOW/);
});
test('native playlist uses bounded chunks and source change rejects old news callbacks',()=>{
 const bridge=read('../android/src/dev/fintech/marketcharts/ChartsView.java');
 const media=read('../web/media.js'),news=read('../web/news.js');
 assert.match(bridge,/chunkSize=48000/);
 assert.match(bridge,/__newviewPlaylistChunk/);
 assert.match(media,/__newviewPlaylistChunk/);
 assert.match(news,/nativePending\.delete\(id\)/);
});
