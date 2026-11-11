import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../web/media.js',import.meta.url),'utf8');
test('inline IPTV player exists and retains native player bridge',()=>{
 assert.match(source,/newview-inline-tv/);
 assert.match(source,/NewViewNative\.playStream/);
 assert.match(source,/inlineVideo\.pause\(\)/);
});
test('HLS and MP4 extensions use a literal-dot regex, not escaped backslash',()=>{
 assert.ok(source.includes('/\\.(m3u8|mp4)(?:$|[?#])/i'),'HLS/MP4 extension regex must match a literal dot');
 assert.ok(!source.includes('/\\\\.(m3u8|mp4)(?:$|[?#])/i'),'over-escaped extension regex would reject streams');
 const re=/\.(m3u8|mp4)(?:$|[?#])/i;
 assert.equal(re.test('/live/channel.m3u8?token=demo'),true);
 assert.equal(re.test('/video/sample.mp4'),true);
 assert.equal(re.test('/live/channelxm3u8'),false);
});
