import {NEWS_SOURCES,loadNews} from './news.mjs';

const KEY='source-health:v1';
const IPTV_KEY='source-health:iptv:last-check';
const IPTV_URL='https://iptv-org.github.io/iptv/index.m3u';
const IPTV_INTERVAL_MS=3*60*60*1000;
const MAX_AGE_MS=10*60*1000; // Cron is every two minutes; older snapshots are not live health.
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};

const enabled=env=>typeof env?.NEWVIEW_SOURCE_HEALTH?.get==='function'&&typeof env.NEWVIEW_SOURCE_HEALTH.put==='function';
const summary=(status,detail,time)=>({status,detail,checkedAt:new Date(time).toISOString()});

/** Validate only playlist file reachability, never individual IPTV playback. */
export async function probeIPTVDirectory(fetcher=fetch){
 const response=await fetcher(IPTV_URL,{
  redirect:'manual',headers:{Accept:'audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain','Range':'bytes=0-8191'},
  signal:AbortSignal.timeout(12000)
 });
 if(![200,206].includes(response.status)||response.redirected)throw Error('Directory unavailable');
 if(!response.body?.getReader)throw Error('Directory unreadable');
 const reader=response.body.getReader();
 let bytes=0,first='';
 try{
  while(bytes<8192){
   const {done,value}=await reader.read();if(done)break;
   bytes+=value.byteLength;
   if(bytes>16384)throw Error('Directory response exceeded check budget');
   first+=new TextDecoder().decode(value);
   if(first.includes('#EXTM3U'))break;
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(!first.trimStart().startsWith('#EXTM3U'))throw Error('Directory is not an M3U catalog');
 return true;
}

/** Cloudflare Cron: every 2 minutes, fixed allowlist, persistent KV summaries. */
export async function runSourceHealth(env,fetcher=fetch,now=Date.now()){
 if(!enabled(env))return {configured:false};
 const old=await env.NEWVIEW_SOURCE_HEALTH.get(KEY,'json');
 const current=old&&typeof old==='object'&&old.feeds&&typeof old.feeds==='object'?old:{feeds:{},iptv:null};
 const feeds={...current.feeds};
 // Check sources in a bounded sequence; no user supplied URLs are ever requested.
 for(const id of Object.keys(NEWS_SOURCES)){
  try{
   const result=await loadNews(id,fetcher);
   if(!result.items.length)throw Error('No valid source-linked headlines');
   feeds[id]=summary('ok',result.items.length+' valid headlines',now);
  }catch{feeds[id]=summary('failed','Approved feed unavailable',now);}
 }
 let iptv=current.iptv||null;
 const last=Number(await env.NEWVIEW_SOURCE_HEALTH.get(IPTV_KEY))||0;
 if(now-last>=IPTV_INTERVAL_MS){
  try{
   await probeIPTVDirectory(fetcher);
   iptv=summary('ok','Directory reachable; individual channel playback unverified',now);
  }catch{iptv=summary('failed','Public directory check failed; stream availability unknown',now);}
  await env.NEWVIEW_SOURCE_HEALTH.put(IPTV_KEY,String(now),{expirationTtl:604800});
 }
 const result={version:1,updatedAt:new Date(now).toISOString(),feeds,iptv,
  cadence:{newsSeconds:120,iptvSeconds:10800}};
 await env.NEWVIEW_SOURCE_HEALTH.put(KEY,JSON.stringify(result),{expirationTtl:604800});
 return {configured:true,feedCount:Object.keys(feeds).length,iptvChecked:now-last>=IPTV_INTERVAL_MS};
}

export async function handleSourceHealth(env,now=Date.now()){
 if(!enabled(env))return Response.json({error:'Scheduled source monitoring not configured'},{status:503,headers});
 let saved;
 try{saved=await env.NEWVIEW_SOURCE_HEALTH.get(KEY,'json');}
 catch{return Response.json({error:'Source monitoring temporarily unavailable'},{status:503,headers});}
 if(!saved||!saved.updatedAt)return Response.json({error:'No scheduled source-health results yet'},{status:503,headers});
 // Treat corrupt or schema-incompatible KV data as unavailable, not as healthy.
 // Only fixed allowlisted feed IDs and known status values may be published.
 const age=now-Date.parse(saved.updatedAt);
 if(!Number.isFinite(age)||age<0||age>MAX_AGE_MS)return Response.json({error:'Source-health snapshot expired'},{status:503,headers});
 const statuses=new Set(['ok','failed','unknown']);
 const feeds=saved.feeds;
 if(!feeds||typeof feeds!=='object'||Array.isArray(feeds)||
    Object.keys(feeds).length!==Object.keys(NEWS_SOURCES).length||
    Object.keys(feeds).some(id=>!Object.hasOwn(NEWS_SOURCES,id)||!feeds[id]||
      !statuses.has(feeds[id].status)||!Number.isFinite(Date.parse(feeds[id].checkedAt||''))||
      now-Date.parse(feeds[id].checkedAt)<0||now-Date.parse(feeds[id].checkedAt)>MAX_AGE_MS))return Response.json(
  {error:'Source-health snapshot invalid'},{status:503,headers});
 // A fresh cron snapshot can still contain a much older IPTV directory result,
 // because catalog checks are deliberately less frequent than news checks.
 // Do not present an overdue catalog check as currently available.
 const catalog=saved.iptv;
 const checked=Date.parse(catalog?.checkedAt||'');
 const catalogAge=now-checked;
 const iptv=(!catalog||!Number.isFinite(catalogAge)||catalogAge<0||catalogAge>IPTV_INTERVAL_MS+MAX_AGE_MS)
  ?{status:'unknown',detail:'Directory check overdue; individual channel playback unverified',checkedAt:Number.isFinite(checked)?catalog.checkedAt:null}
  :catalog;
 return Response.json({...saved,iptv},{headers});
}
