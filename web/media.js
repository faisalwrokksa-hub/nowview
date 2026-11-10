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
  const valid=['all',...types.filter(x=>preferred.playlistUrl(x))];
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
 const FAV_KEY='newview.media.channel-favorites.v1';
 function readFavorites(){try{const value=JSON.parse(localStorage.getItem(FAV_KEY)||'[]');return new Set(Array.isArray(value)?value.filter(x=>typeof x==='string'&&x.length<2048&&x.startsWith('https://')).slice(0,200):[]);}catch{return new Set();}}
 let favorites=readFavorites();
 function saveFavorites(){try{localStorage.setItem(FAV_KEY,JSON.stringify([...favorites].slice(0,200)));return true;}catch{return false;}}
 const favorite=document.createElement('button');favorite.type='button';favorite.textContent='Save favorite';favorite.disabled=true;
 const favoritesOnly=document.createElement('input');favoritesOnly.type='checkbox';favoritesOnly.id='newview-favorites-only';
 const favoritesLabel=document.createElement('label');favoritesLabel.htmlFor=favoritesOnly.id;favoritesLabel.textContent='Favorites only';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh channels';
 directory.append(heading,status,search,secureLabel,secureOnly,favoritesLabel,favoritesOnly,list,favorite,playChannel,open,refresh);
 category?.parentElement?.append(directory);
 let allChannels=[];let lastFetch=0;let loading=null;
 function renderChannels(){
  if(!preferred?.filterChannels)return;
  const narrowed=category?.value==='favorites'||favoritesOnly.checked?allChannels.filter(c=>favorites.has(c.url)):category?.value&&category.value!=='all'?allChannels.filter(c=>String(c.category||'').toLowerCase().split(/[;,|]/).some(group=>group.trim()===category.value)):allChannels;
  const term=search.value.trim().toLowerCase().slice(0,120);
  const visible=narrowed.filter(c=>(!secureOnly.checked||c.url.startsWith('https://'))&&(!term||(c.name+' '+c.id).toLowerCase().includes(term)));
  const selectedBefore=list.value;
  // Keep the selected channel in the displayed options even if it falls outside the first 1500 results.
  const displayed=visible.slice(0,1500);
  if(selectedBefore&&!displayed.some(c=>c.url===selectedBefore)){
   const retained=visible.find(c=>c.url===selectedBefore);
   if(retained)displayed.push(retained);
  }
  list.replaceChildren(...displayed.map(c=>{const option=document.createElement('option');option.value=c.url;option.textContent=c.name||c.id||'Unnamed channel';return option;}));
  if(selectedBefore&&displayed.some(c=>c.url===selectedBefore))list.value=selectedBefore;
  open.hidden=!visible.length;
  playChannel.disabled=!visible.length;
  favorite.disabled=!visible.length;
  favorite.textContent=visible.length&&favorites.has(list.value)?'Remove favorite':'Save favorite';
  open.setAttribute('aria-disabled',String(!visible.length));
  if(visible.length){open.href=list.value;status.textContent=allChannels.length+' loaded · '+visible.length+' matching (first 1500 displayed). Streams may be unavailable.';}
  else{open.removeAttribute('href');status.textContent=allChannels.length?allChannels.length+' loaded · 0 matching. Choose All channels, disable HTTPS-only, or clear search.':'No channels loaded. Try refresh.';}
 }
 list.addEventListener('change',()=>{if(list.value){open.href=list.value;open.hidden=false;}else{open.hidden=true;open.removeAttribute('href');}playChannel.disabled=!list.value;favorite.disabled=!list.value;favorite.textContent=favorites.has(list.value)?'Remove favorite':'Save favorite';});
 favorite.addEventListener('click',()=>{const url=list.value;if(!url)return;const previous=new Set(favorites);if(favorites.has(url))favorites.delete(url);else if(favorites.size<200)favorites.add(url);else{status.textContent='Maximum 200 favorite channels.';return;}if(!saveFavorites()){favorites=previous;status.textContent='Favorites could not be saved on this device. Your previous favorites are unchanged.';return;}renderChannels();});
 favoritesOnly.addEventListener('change',renderChannels);
 search.addEventListener('input',renderChannels);
 secureOnly.addEventListener('change',renderChannels);
 playChannel.addEventListener('click',()=>{if(!nativeStream()||!list.value)return;try{const url=new URL(list.value);if(url.protocol==='https:'&&!url.username&&!url.password&&!url.port)window.NewViewNative.playStream(url.href);}catch{}});
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
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    try{
     const response=await fetch(preferred.MAIN_PLAYLIST,{cache:'no-store',signal:controller.signal});
     if(!response.ok)throw Error('HTTP '+response.status);
     const declaredSize=Number(response.headers.get('content-length'));
     if(Number.isFinite(declaredSize)&&declaredSize>16000000)throw Error('Playlist too large');
     content=await response.text();
    }finally{clearTimeout(timeout);}
   }
   if(content.length>16000000)throw Error('Playlist too large');
   const parsed=preferred.parseM3U(content);if(!parsed.length)throw Error('No valid channels');
   allChannels=parsed;lastFetch=Date.now();renderChannels();
  }catch(error){
   const reason=error?.name==='AbortError'?'request timed out':String(error?.message||error);
   if(allChannels.length){renderChannels();status.textContent='Refresh failed ('+reason+'). Showing '+allChannels.length+' previously loaded channels; stream availability is not guaranteed.';}
   else{lastFetch=0;list.replaceChildren();playChannel.disabled=true;favorite.disabled=true;open.hidden=true;open.setAttribute('aria-disabled','true');open.removeAttribute('href');status.textContent='Directory unavailable on this device ('+reason+'). Use the official playlist link or retry.';}
  }
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
  if(typeof window.NewViewNative.isPipeTvInstalled!=='function'||!window.NewViewNative.isPipeTvInstalled()){output.textContent='PipeTv is not installed. Install it independently before launching.';return;}
  try{if(typeof window.NewViewNative.openPipeTv!=='function')throw new Error('Unavailable');window.NewViewNative.openPipeTv();output.textContent='Opening PipeTv. Find the video using PipeTv search.';}catch{output.textContent='Unable to open PipeTv on this device.';}
 });
 validate();
 window.NewViewMedia={parse,stopPlayback:clear};
})();
