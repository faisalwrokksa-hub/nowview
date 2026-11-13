'use strict';
/* Private, device-local confirmed playback history; never claim availability
   from a selection or a passive network probe. No analytics or background sync. */
(function(root){
 const KEY='newview.media.watch-history.v1',MAX=30,TTL=30*86400000;
 function safe(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/\.(m3u8|mp4)$/i.test(u.pathname);}catch{return false;}}
 function read(){
  try{
   const value=JSON.parse(localStorage.getItem(KEY)||'[]');
   if(!Array.isArray(value))return [];
   const seen=new Set(),now=Date.now();
   return value.filter(x=>{
    if(!x||!safe(x.url)||!Number.isFinite(x.at)||x.at>now+60000||now-x.at>TTL||seen.has(x.url))return false;
    seen.add(x.url);return true;
   }).slice(0,MAX).map(x=>({url:x.url,name:String(x.name||'Live TV').slice(0,90),at:x.at}));
  }catch{return [];}
 }
 function confirmed(url,name){
  if(!safe(url))return false;
  const entries=read().filter(x=>x.url!==url);
  entries.unshift({url,name:String(name||'Live TV').slice(0,90),at:Date.now()});
  // A playback event is not persisted unless the device actually accepted it.
  try{localStorage.setItem(KEY,JSON.stringify(entries.slice(0,MAX)));}catch{return false;}
  try{root.dispatchEvent(new CustomEvent('newview:viewing-history',{detail:{url,confirmed:true}}));}catch{}
  return true;
 }
 function clear(){
  // Never claim a privacy-sensitive deletion succeeded if local storage refused it.
  try{localStorage.removeItem(KEY);}catch{return false;}
  try{root.dispatchEvent(new CustomEvent('newview:viewing-history',{detail:{cleared:true}}));}catch{}
  return true;
 }
 function importConfirmed(entries){
  if(!Array.isArray(entries)||entries.length>8)return false;
  const now=Date.now(),seen=new Set(),accepted=[];
  for(const item of entries){
   if(!item||!safe(item.url)||item.url.length>300||!Number.isFinite(item.at)||item.at>now+60000||now-item.at>TTL||seen.has(item.url))continue;
   seen.add(item.url);accepted.push({url:item.url,name:String(item.name||'Live TV').slice(0,90),at:item.at});
  }
  if(entries.length&&!accepted.length)return false;
  // A received room snapshot is not an instruction to erase this device's
  // confirmed history. Merge by URL, prefer the most recent verified playback,
  // and retain the same local size and age limits as normal recording.
  const merged=[...accepted,...read()].sort((a,b)=>b.at-a.at);
  const seenUrls=new Set();
  const retained=merged.filter(item=>{
   if(seenUrls.has(item.url))return false;
   seenUrls.add(item.url);return true;
  }).slice(0,MAX);
  try{localStorage.setItem(KEY,JSON.stringify(retained));}catch{return false;}
  try{root.dispatchEvent(new CustomEvent('newview:viewing-history',{detail:{synced:true}}));}catch{}
  return true;
 }
 root.NewViewViewing=Object.freeze({read,confirmed,importConfirmed,clear,safe});
})(typeof window!=='undefined'?window:globalThis);
