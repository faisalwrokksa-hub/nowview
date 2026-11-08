'use strict';
/* Android WebView external links launch in a user-selected browser only for permitted platforms. */
(function(){
 const allowed=new Set(['x.com','www.x.com','tiktok.com','www.tiktok.com','facebook.com','www.facebook.com','youtube.com','www.youtube.com','youtu.be','www.sec.gov','www.federalreserve.gov','stocktwits.com','www.stocktwits.com','truthsocial.com','www.truthsocial.com','polymarket.com','www.polymarket.com','news.google.com','trends.google.com','www.reddit.com','bsky.app','mastodon.social','iptv-org.github.io']);
 function approved(raw){
  try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&allowed.has(u.hostname.toLowerCase());}
  catch{return false;}
 }
 if(typeof document.addEventListener==='function')document.addEventListener('click',event=>{
  const a=event.target?.closest?.('a[href]');
  if(!a||!window.NewViewNative||typeof window.NewViewNative.openApprovedUrl!=='function')return;
  const href=a.href;
  if(!approved(href))return;
  event.preventDefault();
  window.NewViewNative.openApprovedUrl(href);
 });
 window.NewViewExternal={approved};
})();
