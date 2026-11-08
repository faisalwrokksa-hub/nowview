/* Source-linked headlines, with no simulated data or inline HTML. */
'use strict';
(function(){
 const container=document.getElementById('news-items'),status=document.getElementById('news-status');
 const choose=document.getElementById('news-source'),refresh=document.getElementById('news-refresh');
 if(!container||!choose||!refresh)return;
 const external={'fed':'https://www.federalreserve.gov/newsevents/pressreleases.htm','sec':'https://www.sec.gov/newsroom/press-releases'};
 let controller=null;
 const line=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;n.textContent=text;return n;};
 function sourceLink(){
  const link=document.getElementById('news-original');link.href=external[choose.value]||external.fed;
 }
 async function refreshNews(){
  if(controller)controller.abort();
  controller=new AbortController();
  sourceLink();status.textContent='Loading official announcements…';container.replaceChildren();
  if(location.protocol==='file:'){status.textContent='Live RSS is available through the web backend. Open the official source below on this device.';return;}
  try{
   const response=await fetch('/api/news?source='+encodeURIComponent(choose.value),{signal:controller.signal});
   if(!response.ok)throw new Error('News service unavailable');
   const feed=await response.json();
   if(!Array.isArray(feed.items)||!feed.items.length){status.textContent='No announcements returned by this source';return;}
   for(const item of feed.items){
    const url=new URL(item.url);
    if(url.protocol!=='https:'||!['www.sec.gov','www.federalreserve.gov'].includes(url.hostname))continue;
    const article=line('article','news-item','');
    const link=line('a','news-link',item.title);
    link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
    const stamp=item.publishedAt?new Date(item.publishedAt).toLocaleString('en-US',{dateStyle:'medium'}):'Date unavailable';
    article.append(link,line('small','news-meta',item.source+' · '+stamp));
    container.append(article);
   }
   status.textContent='Official announcements · fetched '+new Date(feed.fetchedAt).toLocaleTimeString();
  }catch(err){
   if(err.name==='AbortError')return;
   status.textContent='Headlines unavailable. Open the official source below.';
  }
 }
 refresh.addEventListener('click',refreshNews);
 choose.addEventListener('change',refreshNews);
 sourceLink();
 document.querySelector('[data-view-button="news"]')?.addEventListener('click',()=>{if(!container.children.length)refreshNews();},{once:true});
})();
