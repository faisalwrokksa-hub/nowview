'use strict';
/* NewViewMedia: safe external Android TV PipeTv handoff or official web embed. */
(function(){
 function parse(input){
  try{
   const url=new URL(String(input).trim());
   if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
   const host=url.hostname.toLowerCase();let id=null;
   if(host==='youtu.be'&&/^\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname))id=url.pathname.split('/')[1];
   if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host)){
    if(url.pathname==='/watch')id=url.searchParams.get('v');
    else if(/^\/(embed|live|shorts)\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname))id=url.pathname.split('/')[2];
   }
   return /^[A-Za-z0-9_-]{11}$/.test(id||'')?{id,original:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=0'}:null;
  }catch{return null;}
 }
 const category=document.getElementById('live-tv-category');
 const preferred=window.NewViewChannels;
 function currentDashboard(){return document.body.dataset.currentWorkspace||'myview';}
 function syncDashboardCategories(){
  if(!category||!preferred)return;
  const preferences=window.NewViewShell?.loadFirstLaunch?.();
  const types=preferred.categoriesFor(currentDashboard(),preferences?.interests);
  const valid=types.filter(x=>preferred.playlistUrl(x));
  if(!valid.length)return;
  const previous=category.value;
  category.replaceChildren(...valid.map(x=>{const o=document.createElement('option');o.value=x;o.textContent=x.charAt(0).toUpperCase()+x.slice(1);return o;}));
  category.value=valid.includes(previous)?previous:valid[0];
  category.dispatchEvent(new Event('change'));
 }

 if(typeof document.createElement==='function'){
 const directory=document.createElement('section');directory.id='newview-channel-directory';directory.setAttribute('aria-label','IPTV-org channel directory');
 const heading=document.createElement('h3');heading.textContent='Free live TV directory';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Channel directory not loaded yet.';
 const list=document.createElement('select');list.setAttribute('aria-label','Available IPTV channels');
 const open=document.createElement('a');open.textContent='Open selected stream';open.target='_blank';open.rel='noopener noreferrer';open.hidden=true;
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh channels';
 directory.append(heading,status,list,open,refresh);
 category?.parentElement?.append(directory);
 let allChannels=[];let lastFetch=0;let loading=null;
 function renderChannels(){
  if(!preferred?.filterChannels)return;
  const chosen=preferred.filterChannels(allChannels,currentDashboard(),window.NewViewShell?.loadFirstLaunch?.()?.interests);
  const narrowed=category?.value?chosen.filter(c=>c.category.split(/[;,|]/).some(group=>group.trim()===category.value)):chosen;
  const visible=narrowed;
  list.replaceChildren(...visible.slice(0,1500).map(c=>{const option=document.createElement('option');option.value=c.url;option.textContent=c.name||c.id||'Unnamed channel';return option;}));
  open.hidden=!visible.length;
  if(visible.length){open.href=visible[0].url;status.textContent=visible.length+' channels in this view. Availability and rights vary by channel.';}
  else{open.removeAttribute('href');status.textContent=allChannels.length?'No channels match this category. Select another category.':'No channels loaded. Try refresh.';}
 }
 list.addEventListener('change',()=>{if(list.value)open.href=list.value;});
 async function loadDirectory(force=false){
  if(loading)return loading;
  if(!force&&allChannels.length&&Date.now()-lastFetch<3600000){renderChannels();return;}
  status.textContent='Loading public IPTV directory…';
  loading=(async()=>{try{
   const response=await fetch(preferred.MAIN_PLAYLIST,{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const content=await response.text();if(content.length>16000000)throw Error('Playlist too large');
   const parsed=preferred.parseM3U(content);if(!parsed.length)throw Error('No valid channels');
   allChannels=parsed;lastFetch=Date.now();renderChannels();
  }catch(error){status.textContent='Directory unavailable on this device ('+String(error.message||error)+'). Use the official playlist link or retry.';}
  finally{loading=null;}})();return loading;
 }
 refresh.addEventListener('click',()=>loadDirectory(true));
 category?.addEventListener('change',renderChannels);
 if(typeof document.addEventListener==='function')document.addEventListener('newview:workspace-change',renderChannels);
 if(typeof window.addEventListener==='function')window.addEventListener('newview:preferences-change',renderChannels);
 if(preferred?.MAIN_PLAYLIST)loadDirectory();
 const playlist=document.getElementById('live-tv-playlist');
 if(category&&playlist){category.addEventListener('change',()=>{
  const permitted=new Set(['news','business','sports','documentary','education','kids','music','movies','entertainment','weather','general']);
  const chosen=permitted.has(category.value)?category.value:'news';
  playlist.href=preferred?.playlistUrl(chosen)||preferred?.MAIN_PLAYLIST||'https://iptv-org.github.io/iptv/index.m3u';
 });}
 if(typeof document.addEventListener==='function')document.addEventListener('newview:workspace-change',syncDashboardCategories);
 if(typeof window.addEventListener==='function')window.addEventListener('newview:preferences-change',syncDashboardCategories);
 syncDashboardCategories();
 }
 const input=document.getElementById('media-url');
 const output=document.getElementById('media-status');
 const frame=document.getElementById('media-frame');
 if(!input||!output||!frame){window.NewViewMedia={parse};return;}
 const play=document.getElementById('media-play'),pipe=document.getElementById('media-pipe'),stop=document.getElementById('media-stop'),original=document.getElementById('media-original');
 const native=()=>!!(window.NewViewNative&&typeof window.NewViewNative.openPipeTv==='function');
 function validate(){
  const item=parse(input.value);
  play.disabled=!item;
  original.hidden=!item;
  if(item)original.href=item.original;else original.removeAttribute('href');
  return item;
 }
 function clear(){frame.removeAttribute('src');frame.hidden=true;stop.disabled=true;}
 input.addEventListener('input',()=>{clear();validate();});
 play.addEventListener('click',()=>{
  const item=validate();if(!item)return;
  if(location.protocol==='file:'){output.textContent='On Android TV, open the official YouTube link in your browser or launch PipeTv. Embedded playback is not supported in this APK.';return;}
  clear();frame.src=item.embed;frame.hidden=false;stop.disabled=false;
  output.textContent='Official YouTube embedded player; advertisements may appear.';
 });
 stop.addEventListener('click',()=>{clear();output.textContent='Playback stopped.';});
 pipe.disabled=!native();
 pipe.addEventListener('click',()=>{
  if(!native()){output.textContent='PipeTv handoff requires the NewView Android TV app.';return;}
  if(!window.NewViewNative.isPipeTvInstalled()){output.textContent='PipeTv is not installed. Install it independently before launching.';return;}
  window.NewViewNative.openPipeTv();
  output.textContent='Opening PipeTv. Find the video using PipeTv search.';
 });
 validate();
 window.NewViewMedia={parse,stopPlayback:clear};
})();
