import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const js=fs.readFileSync(new URL('../web/media.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
test('official video URL parsing rejects invalid and hostile URLs',()=>{
 const window={},document={getElementById:()=>null};
 vm.runInNewContext(js,{window,document,URL});
 const parse=window.NewViewMedia.parse;
 assert.equal(parse('https://youtu.be/dQw4w9WgXcQ').id,'dQw4w9WgXcQ');
 assert.equal(parse('https://www.youtube.com/watch?v=dQw4w9WgXcQ').id,'dQw4w9WgXcQ');
 for(const u of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','http://youtube.com/watch?v=dQw4w9WgXcQ','https://youtu.be/not-a-valid-id'])assert.equal(parse(u),null);
});
test('media player has opt-in controls and no automatic video extraction',()=>{
 for(const id of ['media-url','media-pipe','media-play','media-stop','media-frame'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(build,/media\.js/);
 assert.match(build,/frame-src https:/);
 assert.doesNotMatch(js,/youtube-dl|yt-dlp|NewPipeExtractor|SponsorBlock/);
});
test('native bridge has package-specific external launch',()=>{
 const manifest=fs.readFileSync(new URL('../android/AndroidManifest.xml',import.meta.url),'utf8');
 const bridge=fs.readFileSync(new URL('../android/src/dev/fintech/marketcharts/ChartsView.java',import.meta.url),'utf8');
 assert.match(manifest,/dev\.limitedio\.pipetv/);
 assert.match(bridge,/getLaunchIntentForPackage\("dev\.limitedio\.pipetv"\)/);
 assert.match(bridge,/openPipeTv\(/);
});
