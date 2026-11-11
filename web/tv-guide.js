'use strict';
/* Lightweight TV channel guide: derives rows from the existing validated IPTV-org
 * directory controller; no second fetch, no third-party IPTV proxy or false online claims.
 */
(function(root){
 const RECENT_KEY='newview.tv.recent.v1',MAX_RECENTS=20;
 const CATEGORIES=['all','news','business','sports','documentary','education','entertainment','music','kids','movies','weather','general','favorites'];
 function categoryMatches(value,category){
  if(category==='all'||category==='favorites')return true;
  return String(value||'').toLowerCase().split(/[;,|]/).some(group=>group.trim()===category);
 }
 function readRecents(){
  try{const x=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');return Array.isArray(x)?x.filter(v=>typeof v==='string'&&v.startsWith('https://')).slice(0,MAX_RECENTS):[];}catch{return [];}
 }
 function saveRecent(url){
  if(!/^https:\/\//.test(url))return;
  try{localStorage.setItem(RECENT_KEY,JSON.stringify([url,...readRecents().filter(x=>x!==url)].slice(0,MAX_RECENTS)));}catch{}
 }
 function pick(channels,{category='all',query='',hideFailed=true,onlyVerified=false,favorites=new Set(),status=()=> 'unknown'}={}){
  if(!Array.isArray(channels))return [];
  const term=String(query).trim().toLowerCase().slice(0,100);
  const list=channels.filter(c=>{
   if(!c||typeof c.url!=='string'||!c.url.startsWith('https://'))return false;
   const health=status(c.url);
   if(hideFailed&&health==='failed')return false;
   if(onlyVerified&&health!=='ok')return false;
   if(category==='favorites'&&!favorites.has(c.url))return false;
   if(!categoryMatches(c.category,category))return false;
   return !term||(String(c.name||'')+' '+String(c.id||'')).toLowerCase().includes(term);
  });
  return list.sort((a,b)=>{
   const sa=status(a.url)==='ok'?0:1,sb=status(b.url)==='ok'?0:1;
   return sa-sb||String(a.name||'').localeCompare(String(b.name||''));
  });
 }
 function install(){
  const directory=document.getElementById('newview-channel-directory');
  if(!directory||document.getElementById('nv-tv-guide'))return;
  const original=directory.querySelector('select[aria-label="Available IPTV channels"]');
  const search=directory.querySelector('input[aria-label="Search channels"]');
  const category=document.getElementById('live-tv-category');
  const inlineButton=[...directory.querySelectorAll('button')].find(b=>b.textContent==='Play in dashboard');
  const nativeButton=[...directory.querySelectorAll('button')].find(b=>b.textContent==='Play selected channel in NewView');
  const floatingButton=[...directory.querySelectorAll('button')].find(b=>b.textContent==='Float selected IPTV');
  const favoriteButton=[...directory.querySelectorAll('button')].find(b=>b.textContent==='Save favorite');
  const hideFailed=document.getElementById('newview-iptv-hide-failed');
  const refresh=[...directory.querySelectorAll('button')].find(b=>b.textContent==='Refresh channels');
  if(!original||!search||!category||!inlineButton)return;
  const make=(tag,cls,text)=>{
   const node=document.createElement(tag);if(cls)node.className=cls;
   if(text!==undefined)node.textContent=text;return node;
  };
  const guide=make('section','nv-tv-guide');guide.id='nv-tv-guide';guide.setAttribute('aria-label','Live TV channel guide');
  const heading=make('div','nv-tv-heading');
  const info=make('div','nv-tv-heading-copy');
  info.append(make('h3','','Channels'));
  const refreshButton=make('button','nv-tv-refresh','↻ Refresh channels');refreshButton.type='button';
  refreshButton.addEventListener('click',()=>refresh?.click());
  heading.append(info,refreshButton);
  const filters=make('div','nv-tv-filters');filters.setAttribute('aria-label','Channel categories');
  const categoryPicker=make('select','nv-tv-category');categoryPicker.setAttribute('aria-label','Channel category');filters.append(categoryPicker);
  const channelPicker=make('select','nv-tv-channel-picker');channelPicker.setAttribute('aria-label','Select a channel');
  const controls=make('div','nv-tv-controls');
  const input=make('input','nv-tv-search');input.type='search';input.placeholder='Find a channel';input.setAttribute('aria-label','Find channels');input.maxLength=100;
  const verifiedLabel=make('label','nv-tv-check');
  const verified=make('input');verified.type='checkbox';verifiedLabel.append(verified,' Only confirmed playing');
  const failedLabel=make('label','nv-tv-check');
  const failed=make('input');failed.type='checkbox';failed.checked=hideFailed?.checked!==false;failedLabel.append(failed,' Hide failed');
  controls.append(input,verifiedLabel,failedLabel);
  const now=make('div','nv-tv-now');
  const nowText=make('span','','Select a channel to begin');
  const prev=make('button','','◀ Previous'),next=make('button','','Next ▶'),play=make('button','nv-tv-play','▶ Play');
  for(const b of [prev,next,play])b.type='button';
  const note=make('p','nv-tv-count');note.setAttribute('role','status');
  now.append(nowText,prev,play,next);
  guide.append(heading,filters,controls,channelPicker,now,note);
  directory.prepend(guide);
  let selected='',activeCategory='all',displayed=[],rendering=false;
  const health=url=>root.NewViewSourceMonitor?.status?.('iptv',url)||'unknown';
  function favorites(){try{const items=JSON.parse(localStorage.getItem('newview.media.channel-favorites.v1')||'[]');return new Set(Array.isArray(items)?items:[]);}catch{return new Set();}}
  function available(){
   // The existing controller already bounded, validated and de-duplicated URLs.
   // Select options are the currently displayed subset, not a claim of all global streams.
   return [...original.options].filter(x=>x.value.startsWith('https://')).map(o=>({
    url:o.value,name:o.textContent||'Untitled channel',category:'',id:''
   }));
  }
  // Category selection is routed back through the existing playlist metadata filter.
  function setCategory(value){
   activeCategory=value;
   if(value==='favorites'){const box=document.getElementById('newview-favorites-only');if(box&&!box.checked){box.checked=true;box.dispatchEvent(new Event('change'));}}
   else{
    const box=document.getElementById('newview-favorites-only');
    if(box?.checked){box.checked=false;box.dispatchEvent(new Event('change'));}
    if([...category.options].some(x=>x.value===value)){category.value=value;category.dispatchEvent(new Event('change'));}
    else if([...category.options].some(x=>x.value==='all')){category.value='all';category.dispatchEvent(new Event('change'));}
   }
   draw();
  }
  for(const id of CATEGORIES){
   const option=make('option','',id==='all'?'All channels':id==='favorites'?'★ Favorites':id[0].toUpperCase()+id.slice(1));
   option.value=id;categoryPicker.append(option);
  }
  categoryPicker.addEventListener('change',()=>setCategory(categoryPicker.value));
  function selectChannel(url){
   const option=[...original.options].find(o=>o.value===url);
   if(!option)return false;
   original.value=url;original.dispatchEvent(new Event('change'));selected=url;
   saveRecent(url);nowText.textContent=option.textContent||'Selected channel';draw();
   return true;
  }
  function draw(){
   if(rendering)return;rendering=true;
   try{
    const all=available(),results=pick(all,{category:'all',query:input.value,hideFailed:failed.checked,
     onlyVerified:verified.checked,favorites:favorites(),status:health});
    displayed=results;
    channelPicker.replaceChildren();
    const prompt=make('option','',results.length?'Select a channel ('+results.length+')':'No channels found');prompt.value='';channelPicker.append(prompt);
    for(const channel of displayed){
     const state=health(channel.url);
     const label=channel.name.slice(0,120)+(state==='ok'?' • Playing':state==='failed'?' • Unavailable':'');
     const option=make('option','',label);option.value=channel.url;channelPicker.append(option);
    }
    if(displayed.some(x=>x.url===selected))channelPicker.value=selected;
    categoryPicker.value=activeCategory;
    note.textContent=results.length+' channels'+(results.filter(x=>health(x.url)==='ok').length?' · '+results.filter(x=>health(x.url)==='ok').length+' confirmed':'');
    const enabled=displayed.length>0;play.disabled=!selected||!displayed.some(x=>x.url===selected);prev.disabled=!enabled;next.disabled=!enabled;
   }finally{rendering=false;}
  }
  function shift(delta){
   if(!displayed.length)return;
   const i=displayed.findIndex(x=>x.url===selected);
   selectChannel(displayed[i<0?(delta>0?0:displayed.length-1):(i+delta+displayed.length)%displayed.length].url);
  }
  prev.addEventListener('click',()=>shift(-1));next.addEventListener('click',()=>shift(1));
  play.addEventListener('click',()=>{
   if(!selected||!selectChannel(selected))return;
   // Floating IPTV dock is the primary video surface; retain native/inline fallback.
   if(floatingButton&&!floatingButton.disabled)floatingButton.click();
   else if(nativeButton&&!nativeButton.hidden&&!nativeButton.disabled)nativeButton.click();
   else if(!inlineButton.disabled)inlineButton.click();
  });
  channelPicker.addEventListener('change',()=>{if(channelPicker.value)selectChannel(channelPicker.value);});
  input.addEventListener('input',draw);verified.addEventListener('change',draw);
  failed.addEventListener('change',()=>{if(hideFailed){hideFailed.checked=failed.checked;hideFailed.dispatchEvent(new Event('change'));}draw();});
  original.addEventListener('change',()=>{selected=original.value;nowText.textContent=original.selectedOptions[0]?.textContent||'Select a channel';draw();});
  // An existing MutationObserver watches the real directory (updated by the
  // IPTV-org refresh workflow). No second network fetch is introduced.
  const observer=new MutationObserver(()=>{if(!document.hidden)draw();});
  observer.observe(original,{childList:true,subtree:true});
  root.addEventListener?.('newview:source-status',event=>{if(event.detail?.kind==='iptv'&&!document.hidden)draw();});
  root.addEventListener?.('newview:source-filter',()=>{failed.checked=root.NewViewSourceMonitor?.getSettings?.().hideFailed!==false;draw();});
  document.addEventListener('newview:workspace-change',e=>{if(e.detail?.view==='media')draw();});
  draw();
 }
 root.NewViewTVGuide=Object.freeze({pick,categoryMatches,readRecents});
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
})(typeof window!=='undefined'?window:globalThis);
