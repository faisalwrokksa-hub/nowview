'use strict';
/* Device-local suggestions: bounded, muted media probes; never a promise of future availability. */
(function(root){
 const KEY='newview.channel-checks.v1',TTL=30*60*1000,MAX_CHECKS=8;
 let cache={},catalog=[],running=false,generation=0,lastCatalog='';
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))cache=saved;}catch{}
 const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/\.(m3u8|mp4)$/i.test(u.pathname);}catch{return false;}};
 function state(url){const x=cache[url];return x&&Date.now()-x.time<TTL&&x.time<=Date.now()+60000?x.status:'unchecked';}
 function save(){const entries=Object.entries(cache).filter(([,v])=>v&&Number.isFinite(v.time)&&Date.now()-v.time<TTL).sort((a,b)=>b[1].time-a[1].time).slice(0,160);cache=Object.fromEntries(entries);try{localStorage.setItem(KEY,JSON.stringify(cache));}catch{}}
 function mark(url,status){if(!safe(url)||!['ready','playing','unavailable','unknown'].includes(status))return;cache[url]={status,time:Date.now()};save();root.dispatchEvent(new CustomEvent('newview:channel-check',{detail:{url,status}}));}
 function preferences(){
  try{const x=JSON.parse(localStorage.getItem('newview.recommendation.preferences.v1')||'{}');
   return {language:['any','english','arabic','spanish','french'].includes(x?.language)?x.language:'any',
    interest:['all','news','business','sports','music'].includes(x?.interest)?x.interest:'all'};
  }catch{return {language:'any',interest:'all'};}
 }
 function favorites(){
  try{const data=JSON.parse(localStorage.getItem('newview.media.channel-favorites.v1')||'[]');
   return new Set(Array.isArray(data)?data.filter(x=>typeof x==='string').slice(0,200):[]);
  }catch{return new Set();}
 }
 function score(item,context){
  const s=state(item.url);let n=({playing:1000,ready:500,unchecked:0,unknown:-10,unavailable:-1000})[s]||0;
  if(context.favorites.has(item.url))n+=280;
  const recent=context.history.findIndex(x=>x.url===item.url);if(recent>=0)n+=Math.max(30,210-recent*8);
  if(context.prefs.language!=='any'&&String(item.name).toLowerCase().includes(context.prefs.language))n+=70;
  if(context.prefs.interest!=='all'&&String(item.name+' '+(item.category||'')).toLowerCase().includes(context.prefs.interest))n+=85;
  if(/news|business|english|arabic/i.test(item.name))n+=10;
  return n;
 }
 function rank(items){const context={favorites:favorites(),history:root.NewViewViewing?.read?.()||[],prefs:preferences()};return items.filter(x=>x&&safe(x.url)).map((x,index)=>({...x,index})).sort((a,b)=>score(b,context)-score(a,context)||a.index-b.index);}
 function probe(url){return new Promise(resolve=>{
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
  let done=false;const finish=status=>{if(done)return;done=true;clearTimeout(timer);video.onloadeddata=video.onerror=null;video.pause();video.removeAttribute('src');video.load();video.remove();resolve(status);};
  const timer=setTimeout(()=>finish('unknown'),7000);
  video.onloadeddata=()=>finish('ready');video.onerror=()=>finish('unavailable');
  video.src=url;video.load();
 });}
 async function check(force=false){
  if(running||document.hidden||navigator.onLine===false)return false;
  const ticket=++generation;running=true;
  root.dispatchEvent(new CustomEvent('newview:channel-scan',{detail:{running:true}}));
  const queue=rank(catalog).filter(x=>force||state(x.url)==='unchecked').slice(0,MAX_CHECKS);
  async function worker(){while(queue.length&&ticket===generation&&!document.hidden){const item=queue.shift();const status=await probe(item.url);if(ticket===generation)mark(item.url,status);}}
  try{await Promise.all([worker(),worker()]);}finally{running=false;root.dispatchEvent(new CustomEvent('newview:channel-scan',{detail:{running:false}}));}
  return true;
 }
 function setCatalog(items){catalog=rank(items).slice(0,120);const key=catalog.map(x=>x.url).sort().join('|');if(key!==lastCatalog){lastCatalog=key;if(!running)void check();}}
 root.NewViewChannelPicks=Object.freeze({rank,state,mark,check,setCatalog});
})(window);
