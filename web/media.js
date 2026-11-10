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
  const types=typeof preferred.categoriesFor==='function'?preferred.categoriesFor(currentDashboard(),preferences?.interests):[];
  const valid=['all',...(Array.isArray(types)?types:[]).filter(x=>typeof x==='string'&&typeof preferred.playlistUrl==='function'&&preferred.playlistUrl(x))];
  if(!valid.length)return;
  const previous=category.value;
  category.replaceChildren(...valid.map(x=>{const o=document.createElement('option');o.value=x;o.textContent=x.charAt(0).toUpperCase()+x.slice(1);return o;}));
  category.value=valid.includes(previous)?previous:'all';
  category.dispatchEvent(new Event('change'));
 }

 if(typeof document.createElement==='function'){
 const directory=document.createElement('section');directory.id='newview-channel-directory';directory.setAttribute('aria-label','IPTV-org channel directory');
 const heading=document.createElement('h3');heading.textContent='Free live TV directory';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Channel directory not loaded yet.';
 const list=document.createElement('select');list.setAttribute('aria-label','Available IPTV channels');
 const search=document.createElement('input');search.type='search';search.placeholder='Filter channels by name or ID';search.setAttribute('aria-label','Search channels');
 const secureOnly=document.createElement('input');secureOnly.type='checkbox';secureOnly.checked=true;secureOnly.id='newview-https-only';
 const secureLabel=document.createElement('label');secureLabel.htmlFor=secureOnly.id;secureLabel.textContent='HTTPS streams only';
 const nativeStream=()=>typeof window.NewViewNative?.playStream==='function';
 const playChannel=document.createElement('button');playChannel.type='button';playChannel.textContent='Play selected channel in NewView';playChannel.hidden=!nativeStream();playChannel.disabled=true;
 const open=document.createElement('a');open.textContent='Open selected stream';open.target='_blank';open.rel='noopener noreferrer';open.hidden=true;
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh channels';
 directory.append(heading,status,search,secureLabel,secureOnly,list,playChannel,open,refresh);
 category?.parentElement?.append(directory);
 let allChannels=[];let lastFetch=0;let loading=null;
 function renderChannels(){
  if(!preferred?.filterChannels)return;
  const narrowed=category?.value&&category.value!=='all'&&category.value!=='favorites'?allChannels.filter(c=>String(c.category||'').toLowerCase().split(/[;,|]/).some(group=>group.trim()===category.value)):allChannels;
  const term=search.value.trim().toLowerCase().slice(0,120);
  const visible=narrowed.filter(c=>typeof c.url==='string'&&(!secureOnly.checked||c.url.startsWith('https://'))&&(!term||(String(c.name||'')+' '+String(c.id||'')).toLowerCase().includes(term)));
  const previous=list.value;
  list.replaceChildren(...visible.slice(0,1500).map(c=>{const option=document.createElement('option');option.value=c.url;option.textContent=c.name||c.id||'Unnamed channel';return option;}));
  if(previous&&[...list.options].some(o=>o.value===previous))list.value=previous;
  open.hidden=!visible.length;
  playChannel.disabled=!visible.length;
  open.setAttribute('aria-disabled',String(!visible.length));
  if(visible.length){open.href=list.value;status.textContent=allChannels.length+' loaded · '+visible.length+' matching (first 1500 displayed). Streams may be unavailable.';}
  else{open.removeAttribute('href');status.textContent=allChannels.length?allChannels.length+' loaded · 0 matching. Choose All channels, disable HTTPS-only, or clear search.':'No channels loaded. Try refresh.';}
 }
 list.addEventListener('change',()=>{if(list.value)open.href=list.value;});
 search.addEventListener('input',renderChannels);
 secureOnly.addEventListener('change',renderChannels);
 playChannel.addEventListener('click',()=>{if(!nativeStream()){status.textContent='Native IPTV playback is not available on this device.';return;}if(!list.value){status.textContent='Select a channel first.';return;}try{const url=new URL(list.value);if(url.protocol!=='https:'||url.username||url.password||url.port){status.textContent='Only secure HTTPS streams can be launched in NewView.';return;}window.NewViewNative.playStream(url.href);status.textContent='Opening selected channel. Playback depends on stream availability.';}catch{status.textContent='Could not launch this stream. Try another channel.';}});
 async function loadDirectory(force=false){
  if(loading)return loading;
  if(!force&&allChannels.length&&Date.now()-lastFetch<3600000){renderChannels();return;}
  status.textContent='Loading public IPTV directory…';
  loading=(async()=>{try{
   let content;
   if(location.protocol==='file:'&&typeof window.NewViewNative?.fetchPublicPlaylist==='function'){
    content=await new Promise((resolve,reject)=>{
     const id=Date.now()+Math.floor(Math.random()*1000);
     let parts=[],total=0;
     const cleanup=()=>{clearTimeout(timer);delete window.__newviewPlaylistChunk;parts=[];};
     const timer=setTimeout(()=>{cleanup();reject(Error('Directory timeout'));},45000);
     window.__newviewPlaylistChunk=(received,chunk,last,error)=>{
      if(received!==id)return;
      if(error){cleanup();reject(Error(error));return;}
      if(typeof chunk!=='string'){cleanup();reject(Error('Invalid playlist response'));return;}
      total+=chunk.length;if(total>16000000){cleanup();reject(Error('Playlist exceeds size limit'));return;}
      parts.push(chunk);
      if(last){const content=parts.join('');cleanup();resolve(content);}
     };
     window.NewViewNative.fetchPublicPlaylist(id);
    });
   }else{
    const response=await fetch(preferred.MAIN_PLAYLIST,{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    content=await response.text();
   }
   if(content.length>16000000)throw Error('Playlist too large');
   if(typeof preferred?.parseM3U!=='function')throw Error('Playlist parser unavailable');
   const parsed=preferred.parseM3U(content);if(!Array.isArray(parsed)||!parsed.length)throw Error('No valid channels');
   allChannels=parsed;lastFetch=Date.now();renderChannels();
  }catch(error){allChannels=[];lastFetch=0;list.replaceChildren();playChannel.disabled=true;open.hidden=true;open.setAttribute('aria-disabled','true');open.removeAttribute('href');status.textContent='Directory unavailable on this device ('+String(error.message||error)+'). Use the official playlist link or retry.';}
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
  try{
   if(typeof window.NewViewNative.isPipeTvInstalled!=='function'||!window.NewViewNative.isPipeTvInstalled()){output.textContent='PipeTv is not installed or installation detection is unavailable.';return;}
   window.NewViewNative.openPipeTv();
   output.textContent='Opening PipeTv. Find the video using PipeTv search.';
  }catch{output.textContent='Unable to open PipeTv on this device.';}
 });
 validate();
 window.NewViewMedia={parse,stopPlayback:clear};
})();
