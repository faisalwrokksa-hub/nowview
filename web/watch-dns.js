'use strict';
/* Device DNS guidance only. WebView and browser DNS cannot be overridden by webpage JavaScript. */
(function(root){
 function install(){
  const host=document.getElementById('nv-watch-hub')||document.querySelector('[data-workspace="media"]');
  if(!host||document.getElementById('nv-watch-dns'))return;
  const details=document.createElement('details');details.id='nv-watch-dns';details.className='shell-card nv-watch-dns';
  const summary=document.createElement('summary');summary.textContent='Network & DNS settings';details.append(summary);
  const intro=document.createElement('p');intro.textContent='NewView uses the DNS configured on your device or network. Cloudflare hosting does not automatically enable Cloudflare DNS. NewView cannot change DNS from inside a website or Android WebView.';details.append(intro);
  const list=document.createElement('ol');
  for(const line of [
   'Android TV (where available): open Android Settings → Network & Internet → Private DNS.',
   'Select Private DNS provider hostname and enter one.one.one.one, then save. Some TV versions do not expose Private DNS; configure your router or use the device vendor’s supported settings instead.',
   'For traditional DNS on a router or device, Cloudflare offers 1.1.1.1 and 1.0.0.1. Traditional DNS is not automatically encrypted.',
   'Reconnect and check whether browsing works. If it fails, restore Automatic DNS.'
  ]){const li=document.createElement('li');li.textContent=line;list.append(li);}details.append(list);
  const note=document.createElement('p');note.textContent='DNS changes are optional. They do not remove YouTube ads, unblock embedded websites, or guarantee access to restricted content.';details.append(note);
  const link=document.createElement('a');link.href='https://one.one.one.one/help/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Check Cloudflare DNS connection (external site)';details.append(link);
  const bookmarks=document.getElementById('nv-watch-bookmark-panel');
  if(bookmarks)bookmarks.after(details);else host.append(details);
 }
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
})(typeof window!=='undefined'?window:globalThis);
