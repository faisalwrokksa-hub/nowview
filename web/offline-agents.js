'use strict';
/* NewView Offline Agent v2 foundation: deterministic, no remote AI, no code execution. */
(function(root){
 const KEY='newview.offline.v2', MAX=200;
 const skills=Object.freeze([
  {id:'market-cache',name:'Market snapshot',input:'market',description:'Read last verified quote and freshness'},
  {id:'local-alerts',name:'Local price alerts',input:'market',description:'Evaluate user-defined thresholds on verified quotes'},
  {id:'dashboard-profile',name:'Dashboard profile',input:'profile',description:'Export or import local widget preferences'},
  {id:'offline-status',name:'Offline diagnostics',input:'none',description:'Report local storage and network state'},
  {id:'iptv-favorites',name:'IPTV favorites',input:'none',description:'Report locally saved HTTPS channel favorites'},
  {id:'news-cache',name:'News snapshot',input:'news',description:'Read source-tagged announcement metadata'},
  {id:'business-cache',name:'Business snapshot',input:'business',description:'Read locally supplied business snapshot'},
  {id:'social-cache',name:'Social snapshot',input:'social',description:'Read local public social bookmark summary'},
  {id:'skill-audit',name:'Skill audit',input:'none',description:'List registered deterministic skills'},
  {id:'task-journal',name:'Task journal',input:'none',description:'Inspect recent agent operations'}
 ].map(s=>Object.freeze(s)));
 const allowed=new Set(skills.map(s=>s.id));
 const storage=()=>{try{return root.localStorage||null}catch{return null}};
 function read(){try{const x=JSON.parse(storage()?.getItem(KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}}
 function write(x){try{const s=storage();if(!s)return false;s.setItem(KEY,JSON.stringify(x));return true}catch{return false}}
 function record(id,status){const state=read();state.journal=Array.isArray(state.journal)?state.journal.slice(-49):[];state.journal.push({id,status,time:new Date().toISOString()});write(state)}
 function safeQuote(x){return x&&typeof x.symbol==='string'&&/^[A-Z0-9]{2,18}$/.test(x.symbol)&&Number.isFinite(x.price)&&x.price>=0&&Number.isFinite(x.quoteTime)&&x.quoteTime>0&&x.quoteTime<=Date.now()/1000+300&&x.quoteTime>=Date.now()/1000-86400?{symbol:x.symbol,price:x.price,quoteTime:x.quoteTime,currency:String(x.currency||'USDT').slice(0,8)}:null}
 function setAlert(rule){if(!rule||typeof rule.symbol!=='string'||!/^[A-Z0-9]{2,18}$/.test(rule.symbol)||!['above','below'].includes(rule.direction)||!Number.isFinite(rule.price)||rule.price<=0)return {ok:false,error:'Invalid threshold'};const state=read();const rules=Array.isArray(state.rules)?state.rules:[];if(rules.length>=MAX)return {ok:false,error:'Alert limit reached'};const id='a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);rules.push({id,symbol:rule.symbol,direction:rule.direction,price:rule.price});state.rules=rules;if(!write(state))return {ok:false,error:'Storage unavailable'};return {ok:true,id}}
 function removeAlert(id){const state=read();state.rules=(Array.isArray(state.rules)?state.rules:[]).filter(x=>x.id!==id);return write(state)}
 function evaluate(x){const quote=safeQuote(x);if(!quote)return [];const state=read(),seen=state.seen||{},matches=[];for(const r of Array.isArray(state.rules)?state.rules:[]){if(r.symbol!==quote.symbol)continue;const hit=r.direction==='above'?quote.price>r.price:quote.price<r.price;const key=r.id;if(hit&&!seen[key])matches.push({id:r.id,symbol:r.symbol,price:quote.price,direction:r.direction,threshold:r.price,quoteTime:quote.quoteTime});seen[key]=hit;}state.seen=seen;write(state);return matches}
 function exportProfile(){const keys=['newview.myview.widgets.v1','newview.media.channel-favorites.v1'];const result={format:'newview-offline-profile',version:1,exportedAt:new Date().toISOString(),data:{}};for(const key of keys){try{const raw=storage()?.getItem(key);if(raw&&raw.length<30000)result.data[key]=JSON.parse(raw)}catch{}}return result}
 function validHttps(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!!u.hostname}catch{return false}}
 function importProfile(input){if(!input||input.format!=='newview-offline-profile'||input.version!==1||!input.data||typeof input.data!=='object')return {ok:false,error:'Unsupported profile'};const widgets=input.data['newview.myview.widgets.v1'];const favorites=input.data['newview.media.channel-favorites.v1'];if(widgets!==undefined){if(!Array.isArray(widgets)||widgets.length>5||widgets.some(x=>!['market','news','media','business','social'].includes(x)))return {ok:false,error:'Invalid widgets'}}if(favorites!==undefined){if(!Array.isArray(favorites)||favorites.length>200||favorites.some(x=>typeof x!=='string'||x.length>2048||!validHttps(x)))return {ok:false,error:'Invalid favorites'}}const s=storage();if(!s)return {ok:false,error:'Storage unavailable'};const keys=['newview.myview.widgets.v1','newview.media.channel-favorites.v1'];const previous=keys.map(k=>s.getItem(k));try{if(widgets)s.setItem(keys[0],JSON.stringify([...new Set(widgets)]));if(favorites)s.setItem(keys[1],JSON.stringify([...new Set(favorites)]));return {ok:true,reloadRequired:true}}catch{for(let i=0;i<keys.length;i++){try{if(previous[i]===null)s.removeItem(keys[i]);else s.setItem(keys[i],previous[i])}catch{}}return {ok:false,error:'Storage write failed'}}}
 const snapshots={};
 function observe(kind,data){if(!['market','news','business','social'].includes(kind)||!data||typeof data!=='object')return [];if(kind==='market'){const quote=safeQuote(data);if(!quote)return [];snapshots.market=quote;return evaluate(quote)}snapshots[kind]={observedAt:new Date().toISOString(),source:typeof data.source==='string'?data.source.slice(0,80):'local',summary:typeof data.headline==='string'?data.headline.slice(0,160):null};return []}
 function execute(id){if(!allowed.has(id))return {ok:false,error:'Skill not registered'};let value;switch(id){case 'skill-audit':value=skills;break;case 'task-journal':value=read().journal||[];break;case 'local-alerts':value=read().rules||[];break;case 'dashboard-profile':value=exportProfile();break;case 'offline-status':value={online:typeof navigator==='undefined'?null:navigator.onLine,storageAvailable:!!storage(),mode:'deterministic',localInference:false};break;case 'iptv-favorites':try{value=JSON.parse(storage()?.getItem('newview.media.channel-favorites.v1')||'[]')}catch{value=[]}break;default:value=snapshots[id.split('-')[0]]||null;}record(id,'completed');return {ok:true,value}}
 const api=Object.freeze({version:'2.0.0-foundation',skills,execute,observe,setAlert,removeAlert,exportProfile,importProfile});
 root.NewViewOfflineAgents=api;
 if(root.addEventListener)for(const kind of ['market','news','business','social'])root.addEventListener('newview:'+kind,e=>{const triggered=observe(kind,e.detail);if(triggered.length&&typeof root.CustomEvent==='function')root.dispatchEvent(new CustomEvent('newview:offline-alerts',{detail:triggered}))});
})(typeof window!=='undefined'?window:globalThis);
