'use strict';
/* Integrated dark YouTube video viewer using only the official player.
   Full youtube.com home/search cannot be framed; no scraping, proxy, or
   DNS claim of ad-free playback. Frame is created only after user action. */
(function(root){
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
  const host=document.getElementById('nv-watch-hub');if(!host||document.getElementById('nv-youtube'))return;
  const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
  const panel=el('section','nv-youtube');panel.id='nv-youtube';panel.hidden=true;
  panel.setAttribute('aria-label','YouTube video viewer');
  const heading=el('div','nv-youtube-heading');heading.append(el('h3','','YouTube'),el('p','','Watch individual videos here, or open YouTube for browsing.'));
  const close=el('button','nv-youtube-close','✕ Close');close.type='button';
  heading.append(close);
  const form=el('form','nv-youtube-form');
  const input=el('input');input.type='url';input.placeholder='Paste a YouTube video link';input.required=true;input.maxLength=1000;input.setAttribute('aria-label','YouTube video URL');
  const play=el('button','','Play video');play.type='submit';
  const official=el('a','nv-youtube-open','Browse YouTube');
  official.href='https://www.youtube.com/';official.target='_blank';official.rel='noopener noreferrer';
  form.append(input,play,official);
  const stage=el('div','nv-youtube-stage');
  const placeholder=el('p','','Paste an individual YouTube video URL to play it in NewView.');
  stage.append(placeholder);
  const status=el('p','nv-youtube-status','The official YouTube player controls playback and may display ads. DNS filtering cannot guarantee ad-free video.');
  status.setAttribute('role','status');
  panel.append(heading,form,stage,status);host.insertBefore(panel,host.querySelector('#nv-watch-channels'));
  function clear(){
   stage.replaceChildren(placeholder);
   panel.hidden=true;input.value='';
   host.querySelector('.nv-hub-grid')?.removeAttribute('hidden');
   host.querySelector('#nv-watch-channels')?.removeAttribute('hidden');
  }
  function open(value){
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
   if(!id){status.textContent='Enter a valid individual YouTube video URL (watch, short, live, or youtu.be).';return false;}
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
  form.addEventListener('submit',e=>{e.preventDefault();load();});
  close.addEventListener('click',clear);
  root.NewViewYouTube=Object.freeze({open,close:clear,parseVideo});
 }
 root.NewViewYouTubeParse=parseVideo;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
 }
})(typeof window!=='undefined'?window:globalThis);
