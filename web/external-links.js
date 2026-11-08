'use strict';
/* Android WebView external links launch in a user-selected browser only for permitted platforms. */
(function(){
 const allowed=new Set(['x.com','www.x.com','tiktok.com','www.tiktok.com','facebook.com','www.facebook.com','youtube.com','www.youtube.com','youtu.be','www.sec.gov','www.federalreserve.gov']);
 function approved(raw){
  try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&allowed.has(u.hostname.toLowerCase());}
  catch{return false;}
 }
 document.addEventListener('click',event=>{
  const a=event.target.closest?.('a[href]');
  if(!a||!window.Fintech||typeof window.Fintech.openApprovedUrl!=='function')return;
  const href=a.href;
  event.preventDefault();
  if(approved(href))window.Fintech.openApprovedUrl(href);
 });
 window.NewViewExternal={approved};
})();
