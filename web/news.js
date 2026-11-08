/* Source-linked headlines, with no simulated data or inline HTML. */
'use strict';
(function(){
 const container=document.getElementById('news-items'),status=document.getElementById('news-status');
 const choose=document.getElementById('news-source'),refresh=document.getElementById('news-refresh');
 if(!container||!choose||!refresh)return;
 const external={'fed':'https://www.federalreserve.gov/newsevents/pressreleases.htm','sec':'https://www.sec.gov/newsroom/press-releases','stocktwits':'https://stocktwits.com/'};
 let controller=null;
 const line=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;n.textContent=text;return n;};
 function sourceLink(){
  const link=document.getElementById('news-original');link.href=external[choose.value]||external.fed;
 }
 async function refreshNews(){
  if(controller)controller.abort();
  controller=new AbortController();
  const current=controller;
  sourceLink();status.textContent='Loading source-linked headlines…';container.replaceChildren();
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:news',{detail:null}));
  if(location.protocol==='file:'){status.textContent='Live RSS is available through the web backend. Open the official source below on this device.';return;}
  try{
   const response=await fetch('/api/news?source='+encodeURIComponent(choose.value),{signal:current.signal});
   if(current!==controller)return;
   if(!response.ok)throw new Error('News service unavailable');
   const feed=await response.json();
   if(current!==controller)return;
   if(!Array.isArray(feed.items)||!feed.items.length){status.textContent='No headlines returned by this source. Check the original publisher.';return;}
   for(const item of feed.items){
    let url;
    try{url=new URL(item.url);}catch{continue;}
    if(url.protocol!=='https:'||url.username||url.password||url.port||!['www.sec.gov','www.federalreserve.gov','stocktwits.com','www.stocktwits.com'].includes(url.hostname))continue;
    const article=line('article','news-item','');
    const link=line('a','news-link',item.title);
    link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
    const stamp=item.publishedAt?new Date(item.publishedAt).toLocaleString('en-US',{dateStyle:'medium'}):'Date unavailable';
    article.append(link,line('small','news-meta',item.source+' · '+stamp));
    container.append(article);
   }
   if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:news',{detail:{source:choose.value,count:container.children.length,headline:container.querySelector('.news-link')?.textContent||null}}));
   const fetched=new Date(feed.fetchedAt);
   const age=Date.now()-fetched.getTime();
   const freshness=Number.isFinite(age)&&age>=0&&age<=3600000?'Recently fetched':'Fetch time unavailable or older than one hour';
   status.textContent=container.children.length?'Source-linked headlines · '+freshness+' · fetched '+(Number.isFinite(fetched.getTime())?fetched.toLocaleString():'unknown'):'No valid announcements returned by this source';
  }catch(err){
   if(current!==controller||err.name==='AbortError')return;
   status.textContent='Headlines unavailable. Open the official source below.';
  }
 }
 refresh.addEventListener('click',refreshNews);
 choose.addEventListener('change',refreshNews);
 sourceLink();
 document.querySelector('[data-view-button="news"]')?.addEventListener('click',()=>{if(!container.children.length)refreshNews();},{once:true});
})();
