import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const monitor=read('web/source-monitor.js'),iptv=read('web/media.js'),news=read('web/news.js'),html=read('web/index.html'),build=read('cloud/build.mjs');
test('realtime source monitor keeps requested defaults and exposes status filtering',()=>{
 const win={addEventListener(){},dispatchEvent(){}};const store=new Map();
 const ctx={window:win,location:{protocol:'https:'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},URL,Date,Map,Set,JSON};
 vm.runInNewContext(monitor,ctx);
 const api=win.NewViewSourceMonitor;
 assert.equal(api.defaults.newsMs,120000);
 assert.equal(api.defaults.marketMs,15000);
 assert.equal(api.defaults.iptvMs,10800000);
 assert.equal(api.getSettings().hideFailed,true);
 assert.equal(api.getSettings().autoCheck,true);
 assert.equal(api.status('iptv','https://example.com/live.m3u8'),'unknown');
 assert.equal(api.hide('iptv','https://example.com/live.m3u8'),false);
 api.mark('iptv','https://example.com/live.m3u8','failed','Playback failed');
 assert.equal(api.status('iptv','https://example.com/live.m3u8'),'failed');
 assert.equal(api.hide('iptv','https://example.com/live.m3u8'),true);
 api.mark('iptv','https://example.com/live.m3u8','ok','Playing');
 assert.equal(api.hide('iptv','https://example.com/live.m3u8'),false);
});
test('IPTV player filters only confirmed failed streams, checks recovery and schedules three-hour directory refresh',()=>{
 assert.match(iptv,/newview-iptv-hide-failed/);
 assert.match(iptv,/NewViewSourceMonitor\?\.status\?\.\('iptv',c\.url\)!=='failed'/);
 assert.match(iptv,/mark\?\.\('iptv',url,'failed'/);
 assert.match(iptv,/mark\?\.\('iptv',url,'ok'/);
 assert.match(iptv,/newview:iptv-refresh/);
 assert.match(iptv,/Date\.now\(\)-lastFetch<10800000/);
});
test('News exposes default hide failed toggle, two minute updates and recovery',()=>{
 assert.match(news,/newview-news-hide-failed/);
 assert.match(news,/status\?\.\('news',option\.value\)==='failed'/);
 assert.match(news,/mark\?\.\('news',sourceId,'ok'/);
 assert.match(news,/mark\?\.\('news',sourceId,'failed'/);
 assert.match(news,/120000\);/);
 assert.match(news,/newview:source-status/);
});
test('source monitor is packaged in dashboard and Worker',()=>{
 assert.equal((html.match(/src="source-monitor\.js"/g)||[]).length,1);
 assert.match(build,/source-monitor\.js/);
 assert.doesNotThrow(()=>new Function(monitor));
 assert.doesNotThrow(()=>new Function(iptv));
 assert.doesNotThrow(()=>new Function(news));
});

test('news request pins its feed ID while failed-source filter changes selection',()=>{
 assert.match(news,/async function refreshNews\(\)\{\s*const sourceId=choose\.value/);
 assert.match(news,/source=\x27\+encodeURIComponent\(sourceId\)/);
 assert.match(news,/mark\?\.\('news',sourceId,'failed'/);
 assert.match(news,/mark\?\.\('news',sourceId,'ok'/);
});

test('cloud health is surfaced without claiming unconfigured monitoring works',()=>{
 assert.match(monitor,/fetch\('\/api\/source-health'/);
 assert.match(monitor,/Cloud monitoring not connected/);
 assert.match(monitor,/Date\.parse\(snapshot\?\.updatedAt/);
 assert.match(monitor,/checkCloud\(\)/);
 assert.match(monitor,/cloudHealth=\{checkedAt:checked/);
});
