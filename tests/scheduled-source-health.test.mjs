import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleSourceHealth,runSourceHealth,probeIPTVDirectory} from '../cloud/source-health.mjs';
import {NEWS_SOURCES} from '../cloud/news.mjs';

const kv=()=>{
 const values=new Map();
 return {
  async get(key,type){const v=values.get(key);return type==='json'&&v?JSON.parse(v):v??null;},
  async put(key,value){values.set(key,value);}
 };
};
const healthyFeeds=now=>Object.fromEntries(Object.keys(NEWS_SOURCES).map(id=>[id,{status:'ok',detail:'Source linked',checkedAt:new Date(now).toISOString()}]));
const sample=Object.fromEntries(Object.entries(NEWS_SOURCES).map(([id,x])=>[x.url,
 '<rss><channel><item><title>Public bulletin</title><link>'+
 (x.homepage||'https://'+x.host+'/news')+
 '</link><pubDate>Wed, 11 Nov 2026 17:00:00 GMT</pubDate></item></channel></rss>']));
function fakeFetch(calls){
 return async(url)=>{
  calls.push(url);
  if(url==='https://iptv-org.github.io/iptv/index.m3u')
   return new Response('#EXTM3U\n#EXTINF:-1,Public TV\nhttps://example.org/live.m3u8',{status:206,headers:{'content-type':'audio/x-mpegurl'}});
  if(Object.hasOwn(sample,url))return new Response(sample[url],{headers:{'content-type':'application/rss+xml'}});
  throw Error('Unexpected outbound request');
 };
}
test('Cron checks only fixed approved public feeds and directory, no arbitrary URLs',async()=>{
 const calls=[],env={NEWVIEW_SOURCE_HEALTH:kv()},fetcher=fakeFetch(calls);
 const start=Date.UTC(2026,10,11,17,0,0);
 const first=await runSourceHealth(env,fetcher,start);
 assert.equal(first.configured,true);
 assert.equal(first.feedCount,Object.keys(NEWS_SOURCES).length);
 assert.equal(first.iptvChecked,true);
 assert.equal(calls.length,Object.keys(NEWS_SOURCES).length+1);
 assert.equal(calls.filter(x=>x.includes('/iptv/index.m3u')).length,1);
 const response=await handleSourceHealth(env,start+1000);
 assert.equal(response.status,200);
 const health=await response.json();
 assert.equal(health.iptv.status,'ok');
 assert.match(health.iptv.detail,/unverified/);
 assert.deepEqual(Object.keys(health.feeds).sort(),Object.keys(NEWS_SOURCES).sort());
 for(const id of Object.keys(NEWS_SOURCES))assert.equal(health.feeds[id].status,'ok');
 await runSourceHealth(env,fetcher,start+120000);
 assert.equal(calls.filter(x=>x.includes('/iptv/index.m3u')).length,1);
 await runSourceHealth(env,fetcher,start+10800000);
 assert.equal(calls.filter(x=>x.includes('/iptv/index.m3u')).length,2);
});
test('Missing KV is a transparent unavailable state, not a simulated healthy status',async()=>{
 assert.deepEqual(await runSourceHealth({},fakeFetch([])),{configured:false});
 const reply=await handleSourceHealth({});
 assert.equal(reply.status,503);
 assert.match(JSON.stringify(await reply.json()),/not configured/);
});
test('Catalog reachability is not falsely inferred from an empty or invalid response',async()=>{
 await assert.rejects(probeIPTVDirectory(async()=>new Response('<html>missing</html>',{status:200})),/not an M3U/);
 await assert.rejects(probeIPTVDirectory(async()=>new Response('',{status:404})),/unavailable/);
});
test('Worker declares a real scheduled handler and a read-only health endpoint',()=>{
 const build=readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 const config=JSON.parse(readFileSync(new URL('../wrangler.json',import.meta.url),'utf8'));
 assert.deepEqual(config.triggers.crons,['*/2 * * * *']);
 assert.match(build,/async scheduled\(event,env,ctx\)/);
 assert.match(build,/ctx\.waitUntil\(runSourceHealth\(env\)\)/);
 assert.match(build,/url\.pathname==='\/api\/source-health'/);
 assert.match(build,/sourceHealth\+entry/);
});

test('release smoke checks exact live revision and real cloud monitoring only when enabled',()=>{
 const smoke=readFileSync(new URL('../tools/smoke-public-newview.mjs',import.meta.url),'utf8');
 assert.match(smoke,/NEWVIEW_EXPECTED_SHA/);
 assert.match(smoke,/version\.revision,expected/);
 assert.match(smoke,/NEWVIEW_REQUIRE_SOURCE_HEALTH/);
 assert.match(smoke,/Object\.keys\(health\.feeds\)\.length===9/);
 assert.match(smoke,/\/api\/source-health/);
 assert.match(smoke,/age<=10\*60\*1000/);
});

test('stopped or delayed cron cannot advertise old feed status as live',async()=>{
 const env={NEWVIEW_SOURCE_HEALTH:kv()};
 const now=Date.UTC(2026,10,13,12,0,0);
 await env.NEWVIEW_SOURCE_HEALTH.put('source-health:v1',JSON.stringify({
  version:1,updatedAt:new Date(now).toISOString(),feeds:healthyFeeds(now),iptv:null
 }));
 assert.equal((await handleSourceHealth(env,now+599999)).status,200);
 const expired=await handleSourceHealth(env,now+600001);
 assert.equal(expired.status,503);
 assert.match(JSON.stringify(await expired.json()),/expired/);
});

test('fresh cron response cannot mask an overdue IPTV directory check',async()=>{
 const env={NEWVIEW_SOURCE_HEALTH:kv()},now=Date.UTC(2026,10,13,12,0,0);
 const snapshot={version:1,updatedAt:new Date(now).toISOString(),feeds:healthyFeeds(now),
  iptv:{status:'ok',detail:'Directory reachable; individual channel playback unverified',
   checkedAt:new Date(now-4*60*60*1000).toISOString()}};
 await env.NEWVIEW_SOURCE_HEALTH.put('source-health:v1',JSON.stringify(snapshot));
 const stale=await handleSourceHealth(env,now);
 assert.equal(stale.status,200);
 assert.equal((await stale.json()).iptv.status,'unknown');
 snapshot.iptv.checkedAt=new Date(now-2*60*60*1000).toISOString();
 await env.NEWVIEW_SOURCE_HEALTH.put('source-health:v1',JSON.stringify(snapshot));
 const fresh=await handleSourceHealth(env,now);
 assert.equal((await fresh.json()).iptv.status,'ok');
});

test('malformed or non-allowlisted KV feed status fails closed',async()=>{
 const env={NEWVIEW_SOURCE_HEALTH:kv()},now=Date.UTC(2026,10,13,12,0,0);
 const base={version:1,updatedAt:new Date(now).toISOString(),feeds:healthyFeeds(now),iptv:null};
 for(const feeds of [
  null,[],{'unapproved-feed':{status:'ok',checkedAt:new Date(now).toISOString()}},
  {fed:{status:'verified',checkedAt:new Date(now).toISOString()}},
  {fed:{status:'ok',checkedAt:'not-a-date'}}
 ]){
  await env.NEWVIEW_SOURCE_HEALTH.put('source-health:v1',JSON.stringify({...base,feeds}));
  const response=await handleSourceHealth(env,now);
  assert.equal(response.status,503,JSON.stringify(feeds));
  assert.match((await response.json()).error,/invalid/);
 }
 await env.NEWVIEW_SOURCE_HEALTH.put('source-health:v1',JSON.stringify({...base,feeds:{
  ...healthyFeeds(now),fed:{status:'failed',checkedAt:new Date(now).toISOString()}
 }}));
 assert.equal((await handleSourceHealth(env,now)).status,200);
});

test('public health rejects missing publishers and stale per-feed checks even if cron timestamp is fresh',async()=>{
 const env={NEWVIEW_SOURCE_HEALTH:kv()},now=Date.UTC(2026,10,13,12,0,0),feeds=healthyFeeds(now);
 delete feeds.fed;
 await env.NEWVIEW_SOURCE_HEALTH.put('source-health:v1',JSON.stringify({updatedAt:new Date(now).toISOString(),feeds}));
 assert.equal((await handleSourceHealth(env,now)).status,503);
 const overdue=healthyFeeds(now);
 overdue.fed.checkedAt=new Date(now-11*60*1000).toISOString();
 await env.NEWVIEW_SOURCE_HEALTH.put('source-health:v1',JSON.stringify({updatedAt:new Date(now).toISOString(),feeds:overdue}));
 assert.equal((await handleSourceHealth(env,now)).status,503);
});
