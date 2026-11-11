'use strict';
/* Watch > YouTube. Android uses NewView's native in-app HTTPS WebView,
   with the official YouTube homepage as its start page. Web deployments
   cannot frame YouTube's homepage (YouTube controls frame policy), so
   retain the official per-video embed without pretending it is a browser. */
(function(root){
 const HOME='https://www.youtube.com/';
 function parseVideo(value){
  try{
   const url=new URL(String(value||'').trim());
   if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
   let id='';
   const host=url.hostname.toLowerCase();
   if(host==='youtu.be'&&/^\/[\w-]{11}\/?$/.test(url.pathname))id=url.pathname.slice(1,12);
   if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host)){
    if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
    else if(/^\/(embed|shorts|live)\/[\w-]{11}\/?$/.test(url.pathname))id=url.pathname.split('/')[2];
   }
   return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
  }catch{return null;}
 }
 function install(){
  const host=document.getElementById('nv-watch-hub');
  if(!host||document.getElementById('nv-youtube'))return;
  const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
  const panel=el('section','nv-youtube');panel.id='nv-youtube';panel.hidden=true;
  panel.setAttribute('aria-label','YouTube browser');
  const heading=el('div','nv-youtube-heading');
  heading.append(el('h3','','YouTube'),el('p','','YouTube is the default homepage.'));
  const close=el('button','nv-youtube-close','✕ Close');close.type='button';heading.append(close);
  const form=el('form','nv-youtube-form');
  const input=el('input');input.type='url';input.placeholder='YouTube video link';input.required=true;input.maxLength=1000;input.setAttribute('aria-label','YouTube video URL');
  const play=el('button','','Play in NewView');play.type='submit';
  const browse=el('button','nv-youtube-open','Browse YouTube');browse.type='button';
  form.append(input,play,browse);
  const stage=el('div','nv-youtube-stage');
  const placeholder=el('p','','The full YouTube homepage cannot be embedded by a regular website. On Android, Browse YouTube opens the built-in browser. On the web, paste a video link to watch here.');
  stage.append(placeholder);
  const status=el('p','nv-youtube-status','YouTube controls ads and playback. DNS filtering cannot guarantee ad-free video.');
  status.setAttribute('role','status');
  panel.append(heading,form,stage,status);
  host.insertBefore(panel,host.querySelector('#nv-watch-channels'));
  const nativeBrowser=()=>typeof root.NewViewNative?.openNewsBrowser==='function';
  function openBrowser(url=HOME){
   if(nativeBrowser()){
    root.NewViewNative.openNewsBrowser(url);
    return true;
   }
   return !!root.NewViewInternalBrowser?.open?.(url,{area:'watch'});
  }
  function clear(){
   stage.replaceChildren(placeholder);panel.hidden=true;input.value='';
   host.querySelector('.nv-hub-grid')?.removeAttribute('hidden');
   host.querySelector('#nv-watch-channels')?.removeAttribute('hidden');
  }
  function open(value){
   // A genuine in-app WebView is available in NewView's Android shell.
   // Do not navigate the external system browser.
   if(!value&&openBrowser())return;
   panel.hidden=false;
   host.querySelector('.nv-hub-grid')?.setAttribute('hidden','');
   host.querySelector('#nv-watch-channels')?.setAttribute('hidden','');
   if(value)input.value=String(value);
   if(value&&parseVideo(value))load();
   else input.focus();
   panel.scrollIntoView?.({block:'start',behavior:'smooth'});
  }
  function load(){
   const id=parseVideo(input.value);
   if(!id){status.textContent='Enter a valid YouTube video link.';return false;}
   const frame=el('iframe');
   frame.title='YouTube video player';
   frame.src='https://www.youtube-nocookie.com/embed/'+id+'?rel=0';
   frame.loading='lazy';
   frame.referrerPolicy='strict-origin-when-cross-origin';
   frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
   frame.allowFullscreen=true;
   frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups');
   stage.replaceChildren(frame);
   status.textContent='Official YouTube embed. Playback and ads are controlled by YouTube.';
   return true;
  }
  browse.addEventListener('click',()=>{
   if(!openBrowser())status.textContent='YouTube full-site browsing is blocked by iframe policy. Use Open YouTube or enter a video link.';
  });
  form.addEventListener('submit',e=>{e.preventDefault();if(openBrowser(input.value))return;load();});
  close.addEventListener('click',clear);
  root.NewViewYouTube=Object.freeze({open,close:clear,parseVideo,openBrowser});
 }
 root.NewViewYouTubeParse=parseVideo;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
 }
})(typeof window!=='undefined'?window:globalThis);
