/* Source-linked headlines, with no simulated data or inline HTML. */
'use strict';
(function(){
 const container=document.getElementById('news-items'),status=document.getElementById('news-status');
 const choose=document.getElementById('news-source'),refresh=document.getElementById('news-refresh');
 if(!container||!choose||!refresh)return;
 const external={'fed':'https://www.federalreserve.gov/newsevents/pressreleases.htm','sec':'https://www.sec.gov/newsroom/press-releases','stocktwits':'https://stocktwits.com/','bbc':'https://www.bbc.com/news','npr':'https://www.npr.org/','guardian':'https://www.theguardian.com/world'};
 const articleHosts=new Set(['www.sec.gov','www.federalreserve.gov','stocktwits.com','www.stocktwits.com','www.bbc.com','bbc.com','www.bbc.co.uk','www.npr.org','text.npr.org','www.theguardian.com']);
 let controller=null;
 let nativeRequestId=0;
 const nativePending=new Map();
 window.__newviewNewsResult=(id,data)=>{const entry=nativePending.get(id);if(!entry)return;nativePending.delete(id);clearTimeout(entry.timer);if(data?.error)entry.reject(Error(data.error));else entry.resolve(data);};
 let lastItems=[];let lastFetchLabel='';
 const search=document.createElement('input');search.type='search';search.placeholder='Filter headlines';search.setAttribute('aria-label','Filter news headlines');
 const auto=document.createElement('input');auto.type='checkbox';auto.id='news-auto-refresh';
 const autoLabel=document.createElement('label');autoLabel.htmlFor=auto.id;autoLabel.textContent='Auto refresh every 2 minutes';
 const hideFailed=document.createElement('input');hideFailed.type='checkbox';hideFailed.id='newview-news-hide-failed';hideFailed.checked=window.NewViewSourceMonitor?.getSettings?.().hideFailed!==false;
 const hiddenLabel=document.createElement('label');hiddenLabel.htmlFor=hideFailed.id;hiddenLabel.textContent='Hide failed feeds';
 function filterSources(){
  const monitor=window.NewViewSourceMonitor;
  for(const option of choose.options)option.hidden=hideFailed.checked&&monitor?.status?.('news',option.value)==='failed';
  const current=choose.selectedOptions[0];
  if(current?.hidden){
   const replacement=[...choose.options].find(option=>!option.hidden);
   if(replacement){choose.value=replacement.value;refreshNews();}
  }
 }
 hideFailed.addEventListener('change',filterSources);
 window.addEventListener?.('newview:source-status',e=>{if(e.detail?.kind==='news')filterSources();});
 window.addEventListener?.('newview:source-filter',()=>{hideFailed.checked=window.NewViewSourceMonitor?.getSettings?.().hideFailed!==false;filterSources();});
 refresh.parentElement?.append(search,autoLabel,auto,hiddenLabel,hideFailed);
 function renderItems(){
  container.replaceChildren();const term=search.value.trim().toLowerCase().slice(0,120);
  for(const item of lastItems){if(term&&!item.title.toLowerCase().includes(term))continue;
   let url;try{url=new URL(item.url);}catch{continue;}
   if(url.protocol!=='https:'||url.username||url.password||url.port||!articleHosts.has(url.hostname))continue;
   const article=line('article','news-item','');const link=line('a','news-link',item.title);
   link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
   const date=item.publishedAt?new Date(item.publishedAt):null;
   const stamp=date&&Number.isFinite(date.getTime())?date.toLocaleString('en-US',{dateStyle:'medium'}):'Date unavailable';
   article.append(link,line('small','news-meta',item.source+' · '+stamp));container.append(article);
  }
  status.textContent=container.children.length+' matching headlines'+(lastFetchLabel?' · '+lastFetchLabel:'');
 }
 search.addEventListener('input',renderItems);
 auto.addEventListener('change',()=>{if(auto.checked)refreshNews();});
 setInterval(()=>{if(auto.checked&&document.body.dataset.currentWorkspace==='media'&&window.NewViewWatch?.currentSection?.()==='headlines')refreshNews();},120000);
 const line=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;n.textContent=text;return n;};
 function sourceLink(){
  const link=document.getElementById('news-original');if(link)link.href=external[choose.value]||external.fed;
 }
 async function refreshNews(){
  if(controller)controller.abort();
  for(const [id,p] of nativePending){clearTimeout(p.timer);p.reject(new DOMException('Superseded','AbortError'));nativePending.delete(id);}
  controller=new AbortController();
  const current=controller;
  sourceLink();status.textContent='Loading source-linked headlines…';container.replaceChildren();lastItems=[];
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:news',{detail:null}));
  try{
   let feed;
   if(location.protocol==='file:'&&typeof window.NewViewNative?.fetchPublicNews==='function'){
    if(choose.value==='stocktwits'){status.textContent='This publisher does not have a verified native RSS feed. Open the source below.';return;}
    feed=await new Promise((resolve,reject)=>{
     const id=++nativeRequestId;
     const timer=setTimeout(()=>{nativePending.delete(id);reject(Error('News timeout'));},20000);
     nativePending.set(id,{resolve,reject,timer});
     window.NewViewNative.fetchPublicNews(choose.value,id);
    });
   }else{
    const response=await fetch('/api/news?source='+encodeURIComponent(choose.value),{signal:current.signal});
    if(!response.ok)throw new Error('News service unavailable');
    feed=await response.json();
   }
   if(current!==controller)return;
   if(!Array.isArray(feed.items)||!feed.items.length){window.NewViewSourceMonitor?.mark?.('news',choose.value,'failed','No headlines returned');status.textContent='No headlines returned by this source. Check the original publisher.';return;}
   lastItems=feed.items.filter(item=>{try{const url=new URL(item.url);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&articleHosts.has(url.hostname)&&typeof item.title==='string'&&item.title.trim();}catch{return false;}}).slice(0,100);
   if(!lastItems.length){window.NewViewSourceMonitor?.mark?.('news',choose.value,'failed','No valid source-linked articles');status.textContent='No valid announcements returned by this source';return;}
   window.NewViewSourceMonitor?.mark?.('news',choose.value,'ok',lastItems.length+' valid headlines');
   renderItems();
   if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:news',{detail:{source:choose.value,count:container.children.length,headline:container.querySelector('.news-link')?.textContent||null}}));
   const fetched=new Date(typeof feed.fetchedAt==='number'?feed.fetchedAt:feed.fetchedAt);
   const age=Date.now()-fetched.getTime();
   const freshness=Number.isFinite(age)&&age>=0&&age<=3600000?'Recently fetched':'Fetch time unavailable or older than one hour';
   lastFetchLabel=freshness+' · fetched '+(Number.isFinite(fetched.getTime())?fetched.toLocaleString():'unknown');renderItems();
  }catch(err){
   if(current!==controller||err.name==='AbortError')return;
   window.NewViewSourceMonitor?.mark?.('news',choose.value,'failed',String(err?.message||'Feed unavailable'));
   status.textContent='Headlines unavailable. Open the official source below.';
  }
 }
 refresh.addEventListener('click',refreshNews);
 choose.addEventListener('change',refreshNews);
 sourceLink();filterSources();
 document.addEventListener('newview:workspace-change',event=>{if(event.detail?.view==='media'&&window.NewViewWatch?.currentSection?.()==='headlines'&&!container.children.length)refreshNews();});
 if(document.body.dataset.currentWorkspace==='media'&&window.NewViewWatch?.currentSection?.()==='headlines')refreshNews();
})();
