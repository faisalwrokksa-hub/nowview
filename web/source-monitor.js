'use strict';
/* NewView Source Monitor — bounded, opt-in-to-network source checks while the
   application is open. Realtime default: news 2m, market freshness 15s,
   IPTV directory 3h; never assert stream working without playback. */
(function(root){
 const KEY='newview.source-monitor.v1';
 const PROFILE=Object.freeze({profile:'realtime',newsMs:120000,marketMs:15000,iptvMs:10800000,hideFailed:true,autoCheck:true});
 const FEEDS=Object.freeze(['fed','sec','stocktwits','bbc','npr','guardian','aljazeera','dw','pbs']);
 const native=typeof location!=='undefined'&&location.protocol==='file:';
 const NEWS_BATCH_SIZE=3; // Sweep all nine publishers across three 2-minute cycles.
 const states=new Map(),journal=[];const MAX_LOG=60,FAIL_TTL=30*60000;
 const OK_TTL=Object.freeze({news:10*60000,iptv:30*60000,api:150000});
 let newsTimer=null,marketTimer=null,iptvTimer=null,active=false,checking=false,cloudHealth=null,nextFeedIndex=0;
 function read(){
  try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&typeof x==='object'?{
   ...PROFILE,hideFailed:x.hideFailed!==false,autoCheck:x.autoCheck!==false
  }:{...PROFILE};}catch{return {...PROFILE};}
 }
 let settings=read();
 function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}
 function event(name,detail){try{root.dispatchEvent(new CustomEvent(name,{detail}));}catch{}}
 function mark(kind,id,status,detail){
  if(!['ok','failed','unknown'].includes(status)||!['news','iptv','api'].includes(kind)||typeof id!=='string'||id.length>2048)return;
  const key=kind+':'+id,old=states.get(key),now=Date.now();
  const next={kind,id,status,checkedAt:now,detail:String(detail||'').slice(0,160)};
  states.set(key,next);
  if(old?.status!==status){
   journal.unshift({kind,id,status,time:now,detail:next.detail});
   if(journal.length>MAX_LOG)journal.length=MAX_LOG;
   event('newview:source-change',next);
   render();
  }
  event('newview:source-status',next);
 }
 function status(kind,id){
  const x=states.get(kind+':'+id);
  if(!x)return 'unknown';
  const age=Date.now()-x.checkedAt;
  if(!Number.isFinite(age)||age<0||age>(x.status==='ok'?OK_TTL[kind]??FAIL_TTL:FAIL_TTL))return 'unknown';
  return x.status;
 }
 function hide(kind,id){return settings.hideFailed&&status(kind,id)==='failed';}
 function getEntries(){return journal.slice();}
 function checkMarket(){
  // This checks market quote freshness, not an extra Binance REST request.
  const snapshot=lastMarket;
  if(snapshot&&Number.isFinite(snapshot.quoteTime)&&snapshot.quoteTime*1000<=Date.now()+300000&&Date.now()-snapshot.quoteTime*1000<120000)
    mark('api','market','ok','Recent Binance-source quote observed');
  else mark('api','market','unknown','No fresh verified quote observed; availability unconfirmed');
 }
 let lastMarket=null;
 root.addEventListener?.('newview:market',e=>{if(e.detail&&typeof e.detail==='object')lastMarket=e.detail;});
 async function checkNews(fullScan=false){
  if(!active||checking||!settings.autoCheck||typeof document!=='undefined'&&document.hidden||navigator.onLine===false)return;
  if(native){
   // Native RSS is implemented separately. Trigger a visible-source refresh,
   // not anonymous API requests to a file:// origin.
   if(root.NewViewWatch?.currentSection?.()==='headlines'&&document.body.dataset.currentWorkspace==='media')
    document.getElementById('news-refresh')?.click();
   return;
  }
  checking=true;
  try{
   // Serial and bounded to avoid spikes or exhausting publisher quotas.
   const targets=fullScan?FEEDS:Array.from({length:Math.min(NEWS_BATCH_SIZE,FEEDS.length)},(_,i)=>FEEDS[(nextFeedIndex+i)%FEEDS.length]);
   if(!fullScan)nextFeedIndex=(nextFeedIndex+targets.length)%FEEDS.length;
   for(const id of targets){
    if(!active||!settings.autoCheck||document.hidden)break;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try{
     const response=await fetch('/api/news?source='+encodeURIComponent(id),{cache:'no-store',signal:controller.signal});
     if(!response.ok)throw Error('HTTP '+response.status);
     const data=await response.json();
     if(!Array.isArray(data.items)||!data.items.length)throw Error('No current articles returned');
     mark('news',id,'ok',data.items.length+' source-linked articles');
     const previous=seenNews.get(id)||new Set();
     const next=new Set(data.items.filter(x=>typeof x?.url==='string').map(x=>x.url));
     if(previous.size){
      let newest=0;
      for(const url of next)if(!previous.has(url))newest++;
      if(newest)notify('News',newest+' new '+id.toUpperCase()+' headlines');
     }
     seenNews.set(id,next);
    }catch(error){mark('news',id,'failed',error?.name==='AbortError'?'Request timed out':error?.message||'Feed unavailable');}
    finally{clearTimeout(timeout);}
   }
  }finally{checking=false;}
 }
 const seenNews=new Map();
 async function checkCloud(){
  if(native||!active||!settings.autoCheck||typeof fetch!=='function'||typeof document==='undefined'||document.hidden)return;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch('/api/source-health',{cache:'no-store',signal:controller.signal});
   if(!response.ok){cloudHealth=null;render();return;}
   const snapshot=await response.json();
   const checked=Date.parse(snapshot?.updatedAt||'');
   if(!Number.isFinite(checked)||Date.now()-checked>600000||Date.now()<checked-60000||!snapshot?.feeds||typeof snapshot.feeds!=='object'){
    cloudHealth=null;render();return;
   }
   cloudHealth={checkedAt:checked,feeds:Object.keys(snapshot.feeds).length,iptv:snapshot.iptv?.status||'unknown'};
   render();
  }catch{cloudHealth=null;render();}
  finally{clearTimeout(timeout);}
 }

 function notify(source,message){
  journal.unshift({kind:'update',id:source,status:'ok',time:Date.now(),detail:message});
  if(journal.length>MAX_LOG)journal.length=MAX_LOG;
  render();event('newview:update',{source,message});
 }
 function render(){
  if(typeof document==='undefined')return;
  const host=document.getElementById('newview-monitor-feed'),summary=document.getElementById('newview-monitor-summary');
  if(summary)summary.textContent=(active&&settings.autoCheck?'Monitoring while NewView is open':'Monitoring paused')+' · News batch every 2m (all feeds ~6m) · Market freshness 15s · IPTV directory 3h'+(cloudHealth?' · Cloud checks '+cloudHealth.feeds+' feeds (checked '+new Date(cloudHealth.checkedAt).toLocaleTimeString()+')':' · Cloud monitoring not connected');
  if(!host)return;
  host.replaceChildren();
  const entries=journal.filter(e=>e.kind==='update'||!settings.hideFailed||e.status!=='failed').slice(0,12);
  if(!entries.length){const p=document.createElement('p');p.textContent='No updates yet. Monitoring checks start while NewView is open.';host.append(p);return;}
  for(const item of entries){
   const row=document.createElement('p');row.className='newview-monitor-entry';
   row.textContent=new Date(item.time).toLocaleTimeString()+' · '+(item.kind==='update'?'NEW · ':'')+item.id+' · '+item.detail;
   host.append(row);
  }
 }
 function setup(){
  if(document.body.classList.contains('home-panel'))return;
  const home=document.querySelector('[data-workspace="myview"]');
  if(!home||document.getElementById('newview-monitor-panel'))return;
  const panel=document.createElement('section');panel.id='newview-monitor-panel';panel.className='shell-card newview-monitor-panel';
  const title=document.createElement('h3');title.textContent='What’s new · Source Monitor';
  const summary=document.createElement('p');summary.id='newview-monitor-summary';summary.setAttribute('role','status');
  const controls=document.createElement('div');controls.className='newview-monitor-controls';
  const hideLabel=document.createElement('label'),hideBox=document.createElement('input');hideBox.type='checkbox';hideBox.id='newview-monitor-hide-failed';hideBox.checked=settings.hideFailed;hideLabel.append(hideBox,' Hide confirmed unavailable sources');
  const autoLabel=document.createElement('label'),autoBox=document.createElement('input');autoBox.type='checkbox';autoBox.id='newview-monitor-auto-check';autoBox.checked=settings.autoCheck;autoLabel.append(autoBox,' Automatic checks');
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Check sources now';
  refresh.addEventListener('click',()=>{checkNews(true);checkCloud();checkMarket();event('newview:iptv-refresh',{});});
  hideBox.addEventListener('change',()=>{settings.hideFailed=hideBox.checked;save();render();event('newview:source-filter',{});});
  autoBox.addEventListener('change',()=>{settings.autoCheck=autoBox.checked;save();restart();});
  controls.append(hideLabel,autoLabel,refresh);
  const feed=document.createElement('div');feed.id='newview-monitor-feed';feed.setAttribute('aria-live','off');
  panel.append(title,summary,controls,feed);home.prepend(panel);render();
 }
 function restart(){
  for(const timer of [newsTimer,marketTimer,iptvTimer])if(timer)clearInterval(timer);
  newsTimer=marketTimer=iptvTimer=null;
  active=true;
  if(settings.autoCheck){
   marketTimer=setInterval(checkMarket,settings.marketMs);
   newsTimer=setInterval(()=>{checkNews();checkCloud();},settings.newsMs);
   iptvTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine!==false)event('newview:iptv-refresh',{});},settings.iptvMs);
   checkMarket();checkNews();checkCloud();
  }
  render();
 }
 function init(){
  if(typeof document==='undefined')return;
  setup();restart();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&settings.autoCheck){checkMarket();checkNews();checkCloud();}});
  root.addEventListener?.('online',()=>{if(settings.autoCheck)checkNews();});
  root.addEventListener?.('pagehide',()=>{active=false;for(const timer of [newsTimer,marketTimer,iptvTimer])if(timer)clearInterval(timer);});
 }
 root.NewViewSourceMonitor=Object.freeze({defaults:PROFILE,feeds:FEEDS,getSettings:()=>({...settings}),status,hide,mark,getEntries,checkNews,notify});
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
})(typeof window!=='undefined'?window:globalThis);
