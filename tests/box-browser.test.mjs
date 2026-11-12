import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../web/internal-browser.js',import.meta.url),'utf8');
const context={window:{},URL};vm.runInNewContext(source,context);
const clip=context.window.NewViewBrowserClipBounds;
test('embedded browser is clipped to nested scroll boxes and viewport',()=>{
 assert.deepEqual(Array.from(clip({left:10,top:100,right:1000,bottom:900},[{left:30,top:150,right:450,bottom:500},{left:20,top:120,right:400,bottom:480}],960,540)),[30,150,370,330,960]);
});
test('off-screen and fractional rectangles cannot exceed a parent boundary',()=>{
 assert.deepEqual(Array.from(clip({left:-5,top:-10,right:400.9,bottom:200.9},[{left:20.2,top:30.1,right:300.8,bottom:180.6}],960,540)),[21,31,279,149,960]);
 assert.equal(clip({left:1000,top:600,right:1200,bottom:800},[],960,540)[2],0);
 assert.equal(clip({left:1000,top:600,right:1200,bottom:800},[],960,540)[3],0);
});
test('remote native pages receive no dashboard bridge and local access stays disabled',()=>{
 const java=fs.readFileSync(new URL('../android/src/dev/fintech/marketcharts/BoxBrowser.java',import.meta.url),'utf8');
 assert.doesNotMatch(java,/addJavascriptInterface/);
 assert.match(java,/setAllowFileAccess\(false\)/);
 assert.match(java,/setAllowContentAccess\(false\)/);
 assert.match(java,/MIXED_CONTENT_NEVER_ALLOW/);
 assert.match(java,/NewsBrowserActivity.safePage/);
});
