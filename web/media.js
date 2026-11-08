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
  const types=preferred.categoriesFor(currentDashboard());
  const valid=types.filter(x=>preferred.playlistUrl(x));
  if(!valid.length)return;
  const previous=category.value;
  category.replaceChildren(...valid.map(x=>{const o=document.createElement('option');o.value=x;o.textContent=x.charAt(0).toUpperCase()+x.slice(1);return o;}));
  category.value=valid.includes(previous)?previous:valid[0];
  category.dispatchEvent(new Event('change'));
 }

 const playlist=document.getElementById('live-tv-playlist');
 if(category&&playlist){category.addEventListener('change',()=>{
  const permitted=new Set(['news','business','sports','documentary','education','kids','music','movies','entertainment','weather','general']);
  const chosen=permitted.has(category.value)?category.value:'news';
  playlist.href='https://iptv-org.github.io/iptv/categories/'+chosen+'.m3u';
 });}
 document.addEventListener('newview:workspace-change',syncDashboardCategories);
 syncDashboardCategories();
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
  if(location.protocol==='file:'){output.textContent='Use the PipeTv button on Android TV. Official web embedding is available only on the hosted web app.';return;}
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
