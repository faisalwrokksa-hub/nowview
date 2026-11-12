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
  try{localStorage.setItem(KEY,JSON.stringify(entries.slice(0,MAX)));}catch{}
  try{root.dispatchEvent(new CustomEvent('newview:viewing-history',{detail:{url,confirmed:true}}));}catch{}
  return true;
 }
 function clear(){try{localStorage.removeItem(KEY);}catch{}try{root.dispatchEvent(new CustomEvent('newview:viewing-history',{detail:{cleared:true}}));}catch{}}
 root.NewViewViewing=Object.freeze({read,confirmed,clear,safe});
})(typeof window!=='undefined'?window:globalThis);
