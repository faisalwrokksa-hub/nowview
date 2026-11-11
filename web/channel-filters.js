'use strict';
/* NewView dashboard-aware IPTV classification. No remote inference or private tracking. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.NewViewChannels=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 const MAIN_PLAYLIST='https://iptv-org.github.io/iptv/index.m3u';
 const API_BASE='https://iptv-org.github.io/api/';
 const catalogPaths=Object.freeze({country:'countries.json',language:'languages.json',category:'categories.json'});
 function catalogUrl(kind){return Object.hasOwn(catalogPaths,kind)?API_BASE+catalogPaths[kind]:null;}
 function scopedPlaylist(kind,code){
  if(kind==='all')return MAIN_PLAYLIST;
  if(kind==='country'&&/^[a-z]{2}$/.test(code))return 'https://iptv-org.github.io/iptv/countries/'+code+'.m3u';
  if(kind==='language'&&/^[a-z]{3}$/.test(code))return 'https://iptv-org.github.io/iptv/languages/'+code+'.m3u';
  if(kind==='category'&&/^[a-z][a-z0-9-]{1,31}$/.test(code))return 'https://iptv-org.github.io/iptv/categories/'+code+'.m3u';
  return null;
 }
 function parseCatalog(kind,items){
  if(!catalogUrl(kind)||!Array.isArray(items)||items.length>1000)return [];
  const result=[],seen=new Set();
  for(const item of items){
   const rawCode=kind==='category'?item?.id:item?.code;
   const code=kind==='country'&&typeof rawCode==='string'?rawCode.toLowerCase():rawCode;
   if(typeof code!=='string'||seen.has(code)||!scopedPlaylist(kind,code))continue;
   const name=typeof item.name==='string'?item.name.slice(0,75):code.toUpperCase();
   if(!name)continue;
   seen.add(code);result.push({code,name});
  }
  return result.sort((a,b)=>a.name.localeCompare(b.name));
 }
 const dashboardTypes=Object.freeze({
  myview:['favorites','news','business','sports','education','entertainment','music','kids','documentary','general'],
  markets:['business','news','documentary'],
  business:['business','news','education','documentary'],
  news:['news','weather','business'],
  media:['entertainment','movies','music','sports','kids','documentary','general'],
  social:['news','entertainment','music','sports','general']
 });
 const known=new Set(['news','business','sports','documentary','education','kids','music','movies','entertainment','weather','general','favorites']);
 function categoriesFor(dashboard,interests){
  const defaults=dashboardTypes[dashboard]||dashboardTypes.myview;
  const extra=Array.isArray(interests)?interests.filter(x=>typeof x==='string'&&known.has(x)):[];
  return [...new Set([...extra,...defaults])];
 }
 function parseM3U(input){
  if(typeof input!=='string'||!input.trimStart().startsWith('#EXTM3U'))return [];
  const lines=input.split(/\r?\n/);const channels=[],seen=new Set();let meta=null;
  for(const raw of lines){const line=raw.trim();if(line.startsWith('#EXTINF:')){
   const attrs={};for(const match of line.matchAll(/([\w-]+)="([^"]*)"/g))attrs[match[1]]=match[2];
   let comma=-1,quoted=false;for(let i=8;i<line.length;i++){if(line[i]==='\"')quoted=!quoted;else if(line[i]===','&&!quoted){comma=i;break;}}
   meta={name:(comma<0?'':line.slice(comma+1)).trim().slice(0,160),category:(attrs['group-title']||'general').trim().toLowerCase(),logo:attrs['tvg-logo']||'',id:attrs['tvg-id']||''};
  }else if(line.startsWith('#'))continue;
  else if(meta){try{const url=new URL(line);if((url.protocol==='https:'||url.protocol==='http:')&&!url.username&&!url.password&&url.hostname&&!seen.has(url.href)){seen.add(url.href);channels.push({...meta,url:url.href});}}catch{}meta=null;}
  }
  return channels;
 }
 function filterChannels(channels,dashboard,interests){
  const allowed=new Set(categoriesFor(dashboard,interests));
  if(!Array.isArray(channels))return [];
  return channels.filter(c=>{
   if(!c||typeof c.category!=='string')return false;
   const groups=c.category.toLowerCase().split(/[;,|]/).map(x=>x.trim()).filter(Boolean);
   return groups.some(group=>allowed.has(group)||(allowed.has('general')&&(group==='undefined'||group==='')));
  });
 }
 function playlistUrl(category){
  if(!known.has(category)||category==='favorites')return null;
  return 'https://iptv-org.github.io/iptv/categories/'+category+'.m3u';
 }
 return Object.freeze({dashboardTypes,categoriesFor,playlistUrl,MAIN_PLAYLIST,catalogUrl,scopedPlaylist,parseCatalog,parseM3U,filterChannels});
});
