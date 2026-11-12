'use strict';
/* NewViewMedia: safe external Android TV PipeTv handoff or official web embed. */
(function(){
 let stopInline=()=>{};
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
  const allTypes=['news','business','sports','documentary','education','entertainment','music','kids','movies','weather','general'];
  const valid=['all',...[...new Set([...(Array.isArray(types)?types:[]),...allTypes])].filter(x=>typeof x==='string'&&typeof preferred.playlistUrl==='function'&&preferred.playlistUrl(x))];
  if(!valid.length)return;
  const previous=category.value;
  category.replaceChildren(...valid.map(x=>{const o=document.createElement('option');o.value=x;o.textContent=x.charAt(0).toUpperCase()+x.slice(1);return o;}));
  category.value=valid.includes(previous)?previous:'all';
  category.dispatchEvent(new Event('change'));
 }

 if(typeof document.createElement==='function'){
 const directory=document.createElement('section');directory.id='newview-channel-directory';directory.className='newview-channel-directory';directory.setAttribute('aria-label','IPTV-org channel directory');
 const heading=document.createElement('h3');heading.textContent='IPTV-org public channel directory';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Public IPTV-org playlist metadata; stream availability and viewing rights depend on each provider.';
 const list=document.createElement('select');list.setAttribute('aria-label','Available IPTV channels');
 const scope=document.createElement('select');scope.id='newview-iptv-scope';scope.setAttribute('aria-label','IPTV catalog grouping');
 for(const [key,label] of [['all','All public channels'],['country','Country'],['language','Language'],['category','Category']]){const option=document.createElement('option');option.value=key;option.textContent=label;scope.append(option);}
 const scopeValue=document.createElement('select');scopeValue.id='newview-iptv-scope-value';scopeValue.setAttribute('aria-label','Select IPTV country, language or category');scopeValue.hidden=true;
 const catalogStatus=document.createElement('p');catalogStatus.setAttribute('role','status');catalogStatus.className='newview-iptv-catalog-status';
 catalogStatus.textContent='Latest IPTV-org public catalog is checked online at startup and refreshed every 3 hours while NewView is active.';
 const sourceLink=document.createElement('a');sourceLink.href='https://github.com/iptv-org/iptv';sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.textContent='Public IPTV directory and source information';
 const search=document.createElement('input');search.type='search';search.placeholder='Filter channels by name or ID';search.setAttribute('aria-label','Search channels');
 const secureOnly=document.createElement('input');secureOnly.type='checkbox';secureOnly.checked=true;secureOnly.id='newview-https-only';
 const secureLabel=document.createElement('label');secureLabel.htmlFor=secureOnly.id;secureLabel.textContent='HTTPS streams only';
 const nativeStream=()=>typeof window.NewViewNative?.playStream==='function';
 const playChannel=document.createElement('button');playChannel.type='button';playChannel.textContent='Play selected channel in NewView';playChannel.hidden=!nativeStream();playChannel.disabled=true;
 const open=document.createElement('a');open.textContent='Open selected stream';open.target='_blank';open.rel='noopener noreferrer';open.hidden=true;
 const inlineWrap=document.createElement('section');inlineWrap.setAttribute('aria-label','Inline IPTV player');inlineWrap.className='newview-inline-tv';const inlineStatus=document.createElement('p');inlineStatus.setAttribute('role','status');inlineStatus.textContent='Choose a channel to try browser-supported playback.';const inlineVideo=document.createElement('video');inlineVideo.controls=true;inlineVideo.playsInline=true;inlineVideo.preload='none';inlineVideo.className='inline-tv-video';inlineVideo.setAttribute('aria-label','Live channel player');const inlinePlay=document.createElement('button');inlinePlay.type='button';inlinePlay.textContent='Play in dashboard';inlinePlay.disabled=true;const inlineStop=document.createElement('button');inlineStop.type='button';inlineStop.textContent='Stop video';inlineStop.disabled=true;const floatChannel=document.createElement('button');floatChannel.type='button';floatChannel.textContent='Float selected IPTV';floatChannel.disabled=true;inlineWrap.append(inlineStatus,inlineVideo,inlinePlay,inlineStop,floatChannel);inlineVideo.addEventListener('error',()=>{const url=inlineVideo.currentSrc||inlineVideo.src;stopInline();if(url)window.NewViewSourceMonitor?.mark?.('iptv',url,'failed','Browser playback failed');inlineStatus.textContent='This stream could not play in the browser. Try native Android TV playback or another channel.';});inlineVideo.addEventListener('playing',()=>{const url=inlineVideo.currentSrc||inlineVideo.src;if(url)window.NewViewSourceMonitor?.mark?.('iptv',url,'ok','Browser playback started');inlineStatus.textContent='Live stream playing. Availability depends on the source.';});stopInline=()=>{inlineVideo.pause();inlineVideo.removeAttribute('src');inlineVideo.load();inlineStop.disabled=true;inlineStatus.textContent='Playback stopped.';};inlineStop.addEventListener('click',stopInline);inlinePlay.addEventListener('click',async()=>{const value=list.value;if(!value||inlinePlay.disabled){inlineStatus.textContent='Select an available channel first.';return;}try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('Only standard HTTPS streams are supported.');if(!/\.(m3u8|mp4)(?:$|[?#])/i.test(url.pathname+url.search))throw Error('Inline playback supports HLS or MP4 URLs only.');inlineVideo.pause();inlineVideo.src=url.href;inlineVideo.load();inlineStop.disabled=false;inlineStatus.textContent='Connecting to selected channel…';await inlineVideo.play();}catch(e){stopInline();inlineStatus.textContent=e?.message||'Playback unavailable. Use the native player if supported.';}});
 floatChannel.addEventListener('click',()=>{
  const url=list.value;
  if(!url||typeof window.NewViewCast?.playIPTV!=='function'){inlineStatus.textContent='Select a channel and open the floating player first.';return;}
  if(!window.NewViewCast.playIPTV(url))inlineStatus.textContent='Selected stream is not compatible with the floating player.';
 });
 const FAV_KEY='newview.media.channel-favorites.v1';
 function readFavorites(){try{const value=JSON.parse(localStorage.getItem(FAV_KEY)||'[]');return new Set(Array.isArray(value)?value.filter(x=>typeof x==='string'&&x.length<2048&&x.startsWith('https://')).slice(0,200):[]);}catch{return new Set();}}
 let favorites=readFavorites();
 function saveFavorites(){try{localStorage.setItem(FAV_KEY,JSON.stringify([...favorites].slice(0,200)));return true;}catch{return false;}}
 const favorite=document.createElement('button');favorite.type='button';favorite.textContent='Save favorite';favorite.disabled=true;
 const favoritesOnly=document.createElement('input');favoritesOnly.type='checkbox';favoritesOnly.id='newview-favorites-only';
 const favoritesLabel=document.createElement('label');favoritesLabel.htmlFor=favoritesOnly.id;favoritesLabel.textContent='Favorites only';
 const hideFailed=document.createElement('input');hideFailed.type='checkbox';hideFailed.id='newview-iptv-hide-failed';hideFailed.checked=window.NewViewSourceMonitor?.getSettings?.().hideFailed!==false;
 const failedLabel=document.createElement('label');failedLabel.htmlFor=hideFailed.id;failedLabel.textContent='Hide confirmed failed streams';
 const retryFailed=document.createElement('button');retryFailed.type='button';retryFailed.textContent='Retry selected stream';retryFailed.setAttribute('aria-label','Retry selected IPTV stream');
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh channels';
 directory.append(heading,catalogStatus,scope,scopeValue,sourceLink,status,search,secureLabel,secureOnly,favoritesLabel,favoritesOnly,failedLabel,hideFailed,list,favorite,playChannel,open,refresh,retryFailed,inlineWrap);
 category?.parentElement?.append(directory);
 let allChannels=[];let lastFetch=0;let loading=null,loadingUrl=null,loadedUrl=null;
 const catalogCache=new Map();
 const selectedPlaylist=()=>preferred?.scopedPlaylist?.(scope.value,scope.value==='all'?'':scopeValue.value)||null;
 async function readCatalog(kind,force=false){
  const endpoint=preferred?.catalogUrl?.(kind);if(!endpoint)return [];
  const cached=catalogCache.get(kind);
  if(!force&&cached&&Date.now()-cached.time<10800000)return cached.items;
  if(location.protocol==='file:'&&typeof window.NewViewNative?.fetchPublicCatalog==='function'){
   const raw=await new Promise((resolve,reject)=>{
    const id=Date.now()+Math.floor(Math.random()*1000),timer=setTimeout(()=>{delete window.__newviewCatalogResult;reject(Error('Catalog timeout'));},20000);
    window.__newviewCatalogResult=(received,data,error)=>{
     if(received!==id)return;
     clearTimeout(timer);delete window.__newviewCatalogResult;
     if(error||typeof data!=='string'||data.length>220000){reject(Error(error||'Invalid catalog'));return;}
     resolve(data);
    };
    try{window.NewViewNative.fetchPublicCatalog(kind,id);}catch(error){clearTimeout(timer);delete window.__newviewCatalogResult;reject(error);}
   });
   const entries=preferred.parseCatalog(kind,JSON.parse(raw));
   if(!entries.length)throw Error('No catalog options returned');
   catalogCache.set(kind,{items:entries,time:Date.now()});return entries;
  }
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(endpoint,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Catalog HTTP '+response.status);
   if(Number(response.headers.get('content-length'))>220000)throw Error('Catalog too large');
   const raw=await response.text();if(raw.length>220000)throw Error('Catalog too large');
   const entries=preferred.parseCatalog(kind,JSON.parse(raw));
   if(!entries.length)throw Error('No catalog options returned');
   catalogCache.set(kind,{items:entries,time:Date.now()});return entries;
  }finally{clearTimeout(timeout);}
 }
 async function updateScope(force=false){
  const kind=scope.value;
  if(kind==='all'){scopeValue.hidden=true;scopeValue.replaceChildren();loadDirectory(true);return;}
  scopeValue.hidden=false;catalogStatus.textContent='Checking current '+kind+' list…';
  try{
   const entries=await readCatalog(kind,force);if(kind!==scope.value)return;
   const previous=scopeValue.value;
   scopeValue.replaceChildren(...entries.map(x=>{const o=document.createElement('option');o.value=x.code;o.textContent=x.name;return o;}));
   const desired=kind==='country'?'sa':kind==='language'?'ara':kind==='category'?'news':'';
   scopeValue.value=entries.some(x=>x.code===previous)?previous:entries.some(x=>x.code===desired)?desired:entries[0].code;
   catalogStatus.textContent=entries.length+' current '+kind+' choices from IPTV-org.';
   loadDirectory(true);
  }catch(error){catalogStatus.textContent='Cannot refresh '+kind+' catalog ('+String(error?.message||error)+'). Using previous choices if available.';if(!scopeValue.options.length)scopeValue.replaceChildren();else loadDirectory(true);}
 }
 scope.addEventListener('change',()=>updateScope(true));
 scopeValue.addEventListener('change',()=>loadDirectory(true));

 function renderChannels(){
  if(!preferred?.filterChannels)return;
  const narrowed=category?.value==='favorites'||favoritesOnly.checked?allChannels.filter(c=>favorites.has(c.url)):category?.value&&category.value!=='all'?allChannels.filter(c=>String(c.category||'').toLowerCase().split(/[;,|]/).some(group=>group.trim()===category.value)):allChannels;
  const term=search.value.trim().toLowerCase().slice(0,120);
  const visible=narrowed.filter(c=>(!secureOnly.checked||c.url.startsWith('https://'))&&(!hideFailed.checked||window.NewViewSourceMonitor?.status?.('iptv',c.url)!=='failed')&&(!term||(c.name+' '+c.id).toLowerCase().includes(term)));
  const selectedBefore=list.value;
  // Keep the selected channel in the displayed options even if it falls outside the first 1500 results.
  const displayed=visible.slice(0,1500);
  if(selectedBefore&&!displayed.some(c=>c.url===selectedBefore)){
   const retained=visible.find(c=>c.url===selectedBefore);
   if(retained)displayed.push(retained);
  }
  list.replaceChildren(...displayed.map(c=>{const option=document.createElement('option');option.value=c.url;option.textContent=c.name||c.id||'Unnamed channel';return option;}));
  if(selectedBefore&&displayed.some(c=>c.url===selectedBefore))list.value=selectedBefore;
  if(selectedBefore&&list.value!==selectedBefore)stopInline();
  const hasSelection=Boolean(list.value)&&displayed.some(c=>c.url===list.value);
  open.hidden=!hasSelection;
  playChannel.disabled=!hasSelection;
  inlinePlay.disabled=!hasSelection;
  favorite.disabled=!hasSelection;
  floatChannel.disabled=!hasSelection;
  favorite.textContent=hasSelection&&favorites.has(list.value)?'Remove favorite':'Save favorite';
  open.setAttribute('aria-disabled',String(!hasSelection));
  if(hasSelection)open.href=list.value;else open.removeAttribute('href');
  if(visible.length){status.textContent=allChannels.length+' IPTV-org entries · '+visible.length+' matching (first 1500 displayed). Third-party streams may fail or require viewing rights.';}
  else{open.removeAttribute('href');status.textContent=allChannels.length?allChannels.length+' loaded · 0 matching. Choose All channels, disable HTTPS-only, or clear search.':'No channels loaded. Try refresh.';}
 }
 list.addEventListener('change',()=>{stopInline();if(list.value){open.href=list.value;open.hidden=false;}else{open.hidden=true;open.removeAttribute('href');}inlinePlay.disabled=!list.value;playChannel.disabled=!list.value;favorite.disabled=!list.value;floatChannel.disabled=!list.value;favorite.textContent=favorites.has(list.value)?'Remove favorite':'Save favorite';});
 favorite.addEventListener('click',()=>{const url=list.value;if(!url)return;if(!url.startsWith('https://')){status.textContent='Only HTTPS channel URLs can be saved as favorites. Enable HTTPS-only or select a secure stream.';return;}const previous=new Set(favorites);if(favorites.has(url))favorites.delete(url);else if(favorites.size<200)favorites.add(url);else{status.textContent='Maximum 200 favorite channels.';return;}if(!saveFavorites()){favorites=previous;status.textContent='Favorites could not be saved on this device. Your previous favorites are unchanged.';return;}renderChannels();});
 favoritesOnly.addEventListener('change',renderChannels);
 search.addEventListener('input',renderChannels);
 hideFailed.addEventListener('change',renderChannels);
 retryFailed.addEventListener('click',()=>{if(!list.value)return;window.NewViewSourceMonitor?.mark?.('iptv',list.value,'unknown','Awaiting new playback check');renderChannels();});
 window.addEventListener?.('newview:source-status',e=>{if(e.detail?.kind==='iptv')renderChannels();});
 window.addEventListener?.('newview:source-filter',()=>{hideFailed.checked=window.NewViewSourceMonitor?.getSettings?.().hideFailed!==false;renderChannels();});
 secureOnly.addEventListener('change',renderChannels);
 playChannel.addEventListener('click',()=>{
  if(!nativeStream()){status.textContent='Native IPTV playback is not available on this device.';return;}if(!list.value){status.textContent='Select a channel first.';return;}
  try{
   const url=new URL(list.value);
   if(url.protocol!=='https:'||url.username||url.password||url.port){status.textContent='Only secure HTTPS streams can be launched inside NewView.';return;}
   const result=window.NewViewNative.playStream(url.href);
   if(result===false){status.textContent='The Android TV player rejected this stream. Try the selected stream link or another channel.';return;}
   status.textContent='Opening selected stream in the Android TV player. Availability depends on the external source.';
   if(result&&typeof result.then==='function'){
    Promise.resolve(result).then(accepted=>{
     if(accepted===false)status.textContent='The Android TV player rejected this stream. Try the selected stream link or another channel.';
    },()=>{status.textContent='Could not launch the Android TV player. Try the selected stream link or another channel.';});
   }
  }catch{
   status.textContent='Could not launch this stream. Try the selected stream link or choose another channel.';
  }
 });
 async function loadDirectory(force=false){
  const url=selectedPlaylist();
  if(!url){catalogStatus.textContent='Choose a supported country, language or category.';return;}
  if(loading){if(url!==loadingUrl)loading.then(()=>loadDirectory(true));return loading;}
  if(!force&&url===loadedUrl&&allChannels.length&&Date.now()-lastFetch<10800000){renderChannels();return;}
  loadingUrl=url;
  status.textContent='Loading public IPTV directory…';
  refresh.disabled=true;refresh.setAttribute('aria-busy','true');
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
     try {
      Promise.resolve(window.NewViewNative.fetchPublicPlaylist(id,scope.value,scope.value==='all'?'':scopeValue.value)).then(accepted=>{if(accepted===false){cleanup();reject(Error('Native playlist request rejected'));}},error=>{
       cleanup();reject(Error('Native playlist request failed: '+String(error?.message||error)));
      });
     } catch(error) {
      cleanup();reject(Error('Native playlist request failed: '+String(error?.message||error)));
     }
    });
   }else{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    try{
     const response=await fetch(url,{cache:'no-store',signal:controller.signal});
     if(!response.ok)throw Error('HTTP '+response.status);
     const declaredSize=Number(response.headers.get('content-length'));
     if(Number.isFinite(declaredSize)&&declaredSize>16000000)throw Error('Playlist too large');
     content=await response.text();
    }finally{clearTimeout(timeout);}
   }
   if(content.length>16000000)throw Error('Playlist too large');
   if(typeof preferred?.parseM3U!=='function')throw Error('Playlist parser unavailable');
   const parsed=preferred.parseM3U(content);if(!Array.isArray(parsed)||!parsed.length)throw Error('No valid channels');
   const existing=loadedUrl===url&&allChannels.length?new Set(allChannels.map(channel=>channel.url)):null;
   const added=existing?parsed.filter(channel=>!existing.has(channel.url)).length:0;
   allChannels=parsed;loadedUrl=url;lastFetch=Date.now();
   if(added>0)window.NewViewSourceMonitor?.notify?.('IPTV',added+' newly listed streams in '+scope.value+' catalog; playback not yet verified');catalogStatus.textContent=parsed.length+' unique streams in '+scope.value+' · checked '+new Date(lastFetch).toLocaleTimeString();window.NewViewSourceMonitor?.mark?.('api','iptv-directory','ok','IPTV directory loaded');renderChannels();
  }catch(error){
   const reason=error?.name==='AbortError'?'request timed out':String(error?.message||error);
   window.NewViewSourceMonitor?.mark?.('api','iptv-directory','failed',reason);
   if(allChannels.length&&loadedUrl===url){renderChannels();status.textContent='Refresh failed ('+reason+'). Showing '+allChannels.length+' previously loaded channels from this catalog; stream availability is not guaranteed.';}
   else{lastFetch=0;allChannels=[];loadedUrl=null;stopInline();list.replaceChildren();playChannel.disabled=true;inlinePlay.disabled=true;floatChannel.disabled=true;favorite.disabled=true;open.hidden=true;open.setAttribute('aria-disabled','true');open.removeAttribute('href');status.textContent='Directory unavailable on this device ('+reason+'). Use the official playlist link or retry.';}
  }
  finally{loading=null;loadingUrl=null;refresh.disabled=false;refresh.removeAttribute('aria-busy');}})();return loading;
 }
 refresh.addEventListener('click',()=>scope.value==='all'?loadDirectory(true):updateScope(true));
 category?.addEventListener('change',renderChannels);
 if(typeof document.addEventListener==='function')document.addEventListener('newview:workspace-change',renderChannels);
 if(typeof window.addEventListener==='function')window.addEventListener('newview:preferences-change',renderChannels);
 if(preferred?.MAIN_PLAYLIST)loadDirectory();
 window.addEventListener?.('newview:iptv-refresh',()=>scope.value==='all'?loadDirectory(true):updateScope(true));
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
 const floatYouTube=document.createElement('button');floatYouTube.type='button';floatYouTube.id='media-float-youtube';floatYouTube.textContent='Float YouTube';
 play.parentElement?.append(floatYouTube);
 floatYouTube.addEventListener('click',()=>{
  const item=parse(input.value);
  if(!item){output.textContent='Enter a valid YouTube video URL first.';return;}
  if(typeof window.NewViewCast?.playYouTube==='function'&&window.NewViewCast.playYouTube(item.original)){
   clear();output.textContent='Video docked. Switch to Markets or MyView while it plays.';
  }else output.textContent='Floating playback unavailable on this device.';
 });
 const native=()=>!!(window.NewViewNative&&typeof window.NewViewNative.openPipeTv==='function');
 function validate(){
  const item=parse(input.value);
  play.disabled=!item;
  original.hidden=!item;
  if(item)original.href=item.original;else original.removeAttribute('href');
  return item;
 }
 function clear(){frame.removeAttribute('src');frame.hidden=true;stop.disabled=true;stopInline();}
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
