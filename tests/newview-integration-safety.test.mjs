import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
test('Cloudflare Worker bundles TV launcher alongside dashboard assets',()=>{
 const build=read('cloud/build.mjs');
 assert.match(build,/['\"]tv-home\\.js['\"]/);
 assert.match(build,/['\"]workspace-shell\\.js['\"]/);
});
test('TV app discovery is capability gated',()=>{
 const tv=read('web/tv-home.js');
 const myview=read('web/myview.js');
 assert.match(tv,/typeof window\\.NewViewApps\\.listLaunchableApps/);
 assert.match(myview,/listLaunchableApps==='function'/);
});
test('Watch and workspace navigation recover focus',()=>{
 assert.match(read('web/watch.js'),/focusInsideHiddenPanel/);
 assert.match(read('web/workspace-shell.js'),/focusWasInHiddenPanel/);
});
test('optional PipeTv bridge methods are guarded',()=>{
 const media=read('web/media.js');
 assert.match(media,/typeof window\\.NewViewNative\\.isPipeTvInstalled/);
 assert.match(media,/typeof window\\.NewViewNative\\.openPipeTv/);
});
