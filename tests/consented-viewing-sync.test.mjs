import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sync=load('web/device-sync.js');
test('encrypted viewing sync defaults off, is per-device opt-in, and never captures screens',()=>{
 assert.match(sync,/newview\.sync\.include-viewing\.v1/);
 assert.match(sync,/localStorage\.getItem\(VIEW_KEY\)==='yes'/);
 assert.match(sync,/shareBox\.type='checkbox'/);
 assert.match(sync,/shareViewing\(\)\)data\.viewing=viewingSnapshot\(\)/);
 assert.match(sync,/AES-GCM/);
 assert.match(sync,/newview\.media\.channel-favorites\.v1/);
 assert.match(sync,/NewViewViewing\?\.importConfirmed/);
 assert.match(sync,/function preserved\(data\)/);
 assert.match(sync,/previousViewing=incoming\.viewing\|\|null/);
 assert.match(sync,/JSON\.stringify\(visible\(incoming\)\)/);
 assert.doesNotMatch(sync,/getDisplayMedia|MediaRecorder|captureScreen/);
});
test('encrypted watch metadata strictly caps histories and rejects unsafe endpoints',()=>{
 assert.match(sync,/v\.favorites\.length>8/);
 assert.match(sync,/v\.history\.length>6/);
 assert.match(sync,/url\.length<=300/);
 assert.match(sync,/u\.protocol==='https:'/);
 assert.match(sync,/!u\.username&&!u\.password&&!u\.port/);
 assert.match(sync,/Date\.now\(\)-x\.at<30\*86400000/);
 assert.match(sync,/this pairing room has been revoked|This pairing room has been revoked/);
});
test('confirmed history imports only bounded, validated HTTPS events',()=>{
 const code=load('web/viewing-history.js'),stored=new Map(),events=[];
 const ctx={URL,Date,JSON,CustomEvent:class{constructor(type,args){this.type=type;this.detail=args.detail;}},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},dispatchEvent:e=>events.push(e)};
 ctx.window=ctx;vm.runInNewContext(code,ctx);
 const t=Date.now();
 assert.equal(ctx.NewViewViewing.importConfirmed([{url:'https://example.com/video.m3u8',name:'News',at:t}]),true);
 assert.equal(ctx.NewViewViewing.read().length,1);
 assert.equal(ctx.NewViewViewing.importConfirmed(Array.from({length:9},()=>({url:'https://example.com/video.m3u8',name:'News',at:t}))),false);
 assert.equal(ctx.NewViewViewing.importConfirmed([{url:'http://local.invalid/x.mp4',name:'unsafe',at:t}]),false);
 assert.equal(ctx.NewViewViewing.read().length,1);
 assert.equal(events.some(x=>x.type==='newview:viewing-history'),true);
});

test('remote history merges with local playback instead of erasing local successes',()=>{
 const code=load('web/viewing-history.js'),stored=new Map();
 const ctx={URL,Date,JSON,CustomEvent:class{constructor(type,args){this.type=type;this.detail=args.detail;}},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},dispatchEvent(){}};
 ctx.window=ctx;vm.runInNewContext(code,ctx);
 const now=Date.now();
 const local='https://local.example/live.m3u8',remote='https://remote.example/live.m3u8';
 assert.equal(ctx.NewViewViewing.confirmed(local,'Local'),true);
 assert.equal(ctx.NewViewViewing.importConfirmed([{url:remote,name:'Remote',at:now-1000}]),true);
 assert.deepEqual(Array.from(ctx.NewViewViewing.read(),x=>x.url),[local,remote]);
 assert.equal(ctx.NewViewViewing.importConfirmed([]),true);
 assert.equal(ctx.NewViewViewing.read().length,2);
 // A stale remote record must not replace a newer local record for the same URL.
 assert.equal(ctx.NewViewViewing.importConfirmed([{url:local,name:'Old copy',at:now-50000}]),true);
 assert.equal(ctx.NewViewViewing.read().find(x=>x.url===local).name,'Local');
});

test('confirmed viewing is not reported as saved when local storage rejects a write',()=>{
 const events=[],stored=new Map();
 let reject=true;
 const ctx={URL,Date,JSON,CustomEvent:class{constructor(type,args){this.type=type;this.detail=args.detail;}},localStorage:{
  getItem:k=>stored.get(k)||null,
  setItem:(k,v)=>{if(reject)throw Error('Quota exceeded');stored.set(k,v);},
  removeItem:k=>stored.delete(k)
 },dispatchEvent:e=>events.push(e)};
 ctx.window=ctx;vm.runInNewContext(load('web/viewing-history.js'),ctx);
 const url='https://media.example.org/live.m3u8';
 assert.equal(ctx.NewViewViewing.confirmed(url,'News'),false);
 assert.equal(ctx.NewViewViewing.read().length,0);
 assert.equal(events.length,0);
 reject=false;
 assert.equal(ctx.NewViewViewing.confirmed(url,'News'),true);
 assert.equal(ctx.NewViewViewing.read().length,1);
 assert.equal(events.length,1);
});
