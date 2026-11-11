'use strict';
/* Route supported external links through NewView's isolated in-app browser on Android. */
(function(){
 const allowed=new Set(['x.com','www.x.com','tiktok.com','www.tiktok.com','facebook.com','www.facebook.com','youtube.com','www.youtube.com','youtu.be','www.sec.gov','www.federalreserve.gov','stocktwits.com','www.stocktwits.com','truthsocial.com','www.truthsocial.com','polymarket.com','www.polymarket.com','news.google.com','trends.google.com','www.reddit.com','bsky.app','mastodon.social','iptv-org.github.io']);
 function approved(raw){
  try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&allowed.has(u.hostname.toLowerCase());}
  catch{return false;}
 }
 if(typeof document.addEventListener==='function')document.addEventListener('click',event=>{
  const a=event.target?.closest?.('a[href]');
  if(!a||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const href=a.href;
  if(!approved(href))return;
  if(typeof window.NewViewNative?.openNewsBrowser==='function'){
   event.preventDefault();window.NewViewNative.openNewsBrowser(href);return;
  }
  // Keep supported external publisher/social shortcuts inside the dashboard
  // when a web preview is possible; never capture non-HTTPS or download links.
  if(a.hasAttribute('download')||a.target!=='_blank'||!window.NewViewInternalBrowser)return;
  event.preventDefault();
  const section=document.body.dataset.simpleSection==='watch'?'watch':'read';
  if(section==='read')window.NewViewSections?.show?.('read');
  window.NewViewInternalBrowser.open(href,{area:section});
 });
 window.NewViewExternal={approved};
})();
