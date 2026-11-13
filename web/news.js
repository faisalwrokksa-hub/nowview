/* Source-linked headlines, with no simulated data or inline HTML. */
'use strict';
(function(){
 const container=document.getElementById('news-items'),status=document.getElementById('news-status');
 const choose=document.getElementById('news-source'),refresh=document.getElementById('news-refresh');
 if(!container||!choose||!refresh)return;
 const external={'fed':'https://www.federalreserve.gov/newsevents/pressreleases.htm','sec':'https://www.sec.gov/newsroom/press-releases','stocktwits':'https://stocktwits.com/','bbc':'https://www.bbc.com/news','npr':'https://www.npr.org/','guardian':'https://www.theguardian.com/world','aljazeera':'https://www.aljazeera.com/','dw':'https://www.dw.com/en/top-stories/s-9097','pbs':'https://www.pbs.org/newshour/'};
 const articleHosts=new Set(['www.sec.gov','www.federalreserve.gov','stocktwits.com','www.stocktwits.com','www.bbc.com','bbc.com','www.bbc.co.uk','www.npr.org','text.npr.org', 'www.theguardian.com','www.aljazeera.com','aljazeera.com','www.dw.com','dw.com','www.pbs.org','pbs.org']);
 let controller=null;
 let nativeRequestId=0;
 const nativePending=new Map();
 window.__newviewNewsResult=(id,data)=>{const entry=nativePending.get(id);if(!entry)return;nativePending.delete(id);clearTimeout(entry.timer);if(data?.error)entry.reject(Error(data.error));else entry.resolve(data);};
 let lastItems=[];let lastFetchLabel='';
 const cacheBySource=new Map(),CACHE_MAX_AGE_MS=3600000; // bounded to the declared nine publishers, memory-only
 // Read source-provided headline and excerpt inside the Read workspace.
 // Do not iframe publishers or scrape copyrighted article bodies.
 const reader=document.createElement('section');reader.className='nv-article-reader';reader.id='nv-article-reader';reader.hidden=true;reader.setAttribute('aria-label','Article reader');
 const readerBack=document.createElement('button');readerBack.type='button';readerBack.className='nv-article-back';readerBack.textContent='← Back to headlines';
 const readerTitle=document.createElement('h2'),readerMeta=document.createElement('p'),readerSummary=document.createElement('p');
 readerMeta.className='nv-article-meta';readerSummary.className='nv-article-content';
 const originalLink=document.createElement('a');originalLink.textContent='Read full article at publisher';originalLink.className='nv-article-original';originalLink.target='_blank';originalLink.rel='noopener noreferrer';
 reader.append(readerBack,readerTitle,readerMeta,readerSummary,originalLink);
 container.parentElement?.insertBefore(reader,container);
 const shell=document.getElementById('nv-watch-headlines');
 function closeReader(){
  reader.hidden=true;container.hidden=false;readerBack.blur();
  const previous=container.querySelector('.news-link');previous?.focus?.();
 }
 readerBack.addEventListener('click',closeReader);
 function openReader(url){
  const item=lastItems.find(x=>x.url===url);
  if(!item)return false;
  readerTitle.textContent=item.title;
  const date=item.publishedAt?new Date(item.publishedAt):null;
  readerMeta.textContent=item.source+(date&&Number.isFinite(date.getTime())?' · '+date.toLocaleString():'');
  readerSummary.textContent=String(item.summary||'').trim()||'This publisher provides a headline without a full excerpt in its news feed. Open the original article to continue reading.';
  originalLink.href=item.url;
  reader.hidden=false;container.hidden=true;
  reader.scrollIntoView?.({block:'start',behavior:'smooth'});
  readerBack.focus();
  return true;
 }
 window.NewViewNewsReader=Object.freeze({openByUrl:openReader,close:closeReader,getItems:()=>lastItems.map(item=>({...item}))});

 const mode=document.createElement('select');mode.className='nv-news-mode';mode.setAttribute('aria-label','News filter');
 for(const [value,label] of [['hot','Top stories (4)'],['all','All headlines']]){const option=document.createElement('option');option.value=value;option.textContent=label;mode.append(option);}
 mode.value='hot';
 refresh.parentElement?.append(mode);
 const search=document.createElement('input');search.type='search';search.placeholder='Filter headlines';search.setAttribute('aria-label','Filter news headlines');
 const auto=document.createElement('input');auto.type='checkbox';auto.id='news-auto-refresh';
 const autoLabel=document.createElement('label');autoLabel.htmlFor=auto.id;autoLabel.textContent='Auto refresh every 2 minutes';
 const hideFailed=document.createElement('input');hideFailed.type='checkbox';hideFailed.id='newview-news-hide-failed';hideFailed.checked=window.NewViewSourceMonitor?.getSettings?.().hideFailed!==false;
 const hiddenLabel=document.createElement('label');hiddenLabel.htmlFor=hideFailed.id;hiddenLabel.textContent='Hide failed feeds';
 function filterSources(){
  const monitor=window.NewViewSourceMonitor;
  const native=location.protocol==='file:'&&typeof window.NewViewNative?.fetchPublicNews==='function';
  const supported=['bbc','guardian','npr','fed','sec'];
  for(const option of choose.options)option.hidden=(native&&!supported.includes(option.value))||(hideFailed.checked&&monitor?.status?.('news',option.value)==='failed');
  const current=choose.selectedOptions[0];
  if(current?.hidden){
   const replacement=(native?supported.map(id=>[...choose.options].find(o=>o.value===id)).filter(Boolean):[...choose.options]).find(option=>!option.hidden);
   if(replacement){choose.value=replacement.value;refreshNews();}
  }
 }
 hideFailed.addEventListener('change',filterSources);
 window.addEventListener?.('newview:source-status',e=>{if(e.detail?.kind==='news')filterSources();});
 window.addEventListener?.('newview:source-filter',()=>{hideFailed.checked=window.NewViewSourceMonitor?.getSettings?.().hideFailed!==false;filterSources();});
 refresh.parentElement?.append(search,autoLabel,auto,hiddenLabel,hideFailed);
 function renderItems(){
  reader.hidden=true;container.hidden=false;
  container.replaceChildren();
  container.classList.toggle('nv-news-cards',mode.value==='hot');
  const term=search.value.trim().toLowerCase().slice(0,120);
  const matches=lastItems.filter(item=>!term||item.title.toLowerCase().includes(term));
  const sorted=mode.value==='hot'?[...matches].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,4):matches;
  for(const item of sorted){
   let url;try{url=new URL(item.url);}catch{continue;}
   if(url.protocol!=='https:'||url.username||url.password||url.port||!articleHosts.has(url.hostname))continue;
   const article=line('article','news-item',''),link=line('a','news-link',item.title);
   link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
   const date=item.publishedAt?new Date(item.publishedAt):null;
   const stamp=date&&Number.isFinite(date.getTime())?date.toLocaleString('en-US',{dateStyle:'medium'}):'Date unavailable';
   article.append(link);
   if(mode.value==='hot'){
    const summary=String(item.summary||'').trim();
    if(summary)article.append(line('p','nv-news-summary',summary.slice(0,210)));
   }
   article.append(line('small','news-meta',item.source+' · '+stamp));container.append(article);
  }
  status.textContent=container.children.length+(mode.value==='hot'?' top stories':' matching headlines')+(lastFetchLabel?' · '+lastFetchLabel:'');
 }
 search.addEventListener('input',renderItems);
 mode.addEventListener('change',renderItems);
 auto.addEventListener('change',()=>{if(auto.checked)refreshNews();});
 setInterval(()=>{if(auto.checked&&document.body.dataset.currentWorkspace==='media'&&window.NewViewWatch?.currentSection?.()==='headlines')refreshNews();},120000);
 const line=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;n.textContent=text;return n;};
 function sourceLink(){
  const link=document.getElementById('news-original');if(link)link.href=external[choose.value]||external.fed;
 }
 async function refreshNews(){
  const sourceId=choose.value;
  const previous=cacheBySource.get(sourceId);
  const cached=previous&&Date.now()-previous.savedAt<CACHE_MAX_AGE_MS?previous:null;
  if(controller)controller.abort();
  for(const [id,p] of nativePending){clearTimeout(p.timer);p.reject(new DOMException('Superseded','AbortError'));nativePending.delete(id);}
  controller=new AbortController();
  const current=controller;
  // A hung network request must not leave Refresh and the news list busy forever.
  const requestTimeout=setTimeout(()=>current.abort(),12000);
  refresh.disabled=true;refresh.setAttribute('aria-busy','true');
  container.setAttribute('aria-busy','true');
  sourceLink();reader.hidden=true;container.hidden=false;
  lastItems=cached?cached.items.slice():[];lastFetchLabel=lastItems.length?'Previously verified headlines · refresh pending':'';
  if(lastItems.length)renderItems();else container.replaceChildren();
  status.textContent=lastItems.length?'Refreshing headlines · displaying earlier verified results':'Loading source-linked headlines…';
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:news',{detail:null}));
  try{
   let feed;
   if(location.protocol==='file:'&&typeof window.NewViewNative?.fetchPublicNews==='function'){
    if(!['fed','sec','bbc','npr','guardian'].includes(sourceId)){status.textContent='This publisher is available through the NewView web news service. In the Android TV APK, open the publisher link below.';return;}
    feed=await new Promise((resolve,reject)=>{
     const id=++nativeRequestId;
     const timer=setTimeout(()=>{nativePending.delete(id);reject(Error('News timeout'));},20000);
     nativePending.set(id,{resolve,reject,timer});
     window.NewViewNative.fetchPublicNews(sourceId,id);
    });
   }else{
    const response=await fetch('/api/news?source='+encodeURIComponent(sourceId),{signal:current.signal});
    if(!response.ok)throw new Error('News service unavailable');
    feed=await response.json();
   }
   if(current!==controller)return;
   if(!Array.isArray(feed.items)||!feed.items.length)throw Error('No headlines returned');
   const verified=feed.items.filter(item=>{try{const url=new URL(item.url);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&articleHosts.has(url.hostname)&&typeof item.title==='string'&&item.title.trim();}catch{return false;}}).slice(0,100);
   if(!verified.length)throw Error('No valid source-linked articles');
   lastItems=verified;
   cacheBySource.set(sourceId,{savedAt:Date.now(),items:verified.slice()});
   const fetched=new Date(feed.fetchedAt);
   const age=Date.now()-fetched.getTime();
   const recent=Number.isFinite(age)&&age>=0&&age<=3600000;
   if(recent)window.NewViewSourceMonitor?.mark?.('news',sourceId,'ok',lastItems.length+' valid recently fetched headlines');
   else window.NewViewSourceMonitor?.mark?.('news',sourceId,'unknown','Publisher feed timestamp is stale, future-dated, or unavailable');
   renderItems();
   if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:news',{detail:{source:sourceId,count:container.children.length,headline:container.querySelector('.news-link')?.textContent||null}}));
   const freshness=recent?'Recently fetched':'Fetch time unavailable, future-dated, or older than one hour';
   lastFetchLabel=freshness+' · fetched '+(Number.isFinite(fetched.getTime())?fetched.toLocaleString():'unknown');renderItems();
  }catch(err){
   if(current!==controller)return;
   const reason=err?.name==='AbortError'?'Request timed out':String(err?.message||'Feed unavailable');
   if(cached?.items.length){
    lastItems=cached.items.slice();lastFetchLabel='Stale saved results · last received '+new Date(cached.savedAt).toLocaleString();
    window.NewViewSourceMonitor?.mark?.('news',sourceId,'unknown','Live refresh failed; previous verified headlines shown');
    renderItems();status.textContent='Live headlines unavailable ('+reason+'). Showing previously verified headlines; retry or open the publisher.';
   }else{
    window.NewViewSourceMonitor?.mark?.('news',sourceId,'failed',reason);
    status.textContent='Headlines unavailable ('+reason+'). Retry refresh or open the official source below.';
   }
  }finally{
   clearTimeout(requestTimeout);
   if(current===controller){refresh.disabled=false;refresh.removeAttribute('aria-busy');container.removeAttribute('aria-busy');}
  }
 }
 refresh.addEventListener('click',refreshNews);
 choose.addEventListener('change',refreshNews);
 sourceLink();filterSources();
 document.addEventListener('newview:workspace-change',event=>{if(event.detail?.view==='media'&&window.NewViewWatch?.currentSection?.()==='headlines'&&!container.children.length)refreshNews();});
 if(document.body.dataset.currentWorkspace==='media'&&window.NewViewWatch?.currentSection?.()==='headlines')refreshNews();
})();
