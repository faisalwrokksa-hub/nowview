/* Source-linked headlines, with no simulated data or inline HTML. */
'use strict';
(function(){
 const container=document.getElementById('news-items'),status=document.getElementById('news-status');
 const choose=document.getElementById('news-source'),refresh=document.getElementById('news-refresh');
 if(!container||!choose||!refresh)return;
 const external={'fed':'https://www.federalreserve.gov/newsevents/pressreleases.htm','sec':'https://www.sec.gov/newsroom/press-releases','stocktwits':'https://stocktwits.com/'};
 let controller=null;
 let lastItems=[];let lastFetchLabel='';
 const search=document.createElement('input');search.type='search';search.placeholder='Filter headlines';search.setAttribute('aria-label','Filter news headlines');
 const auto=document.createElement('input');auto.type='checkbox';auto.id='news-auto-refresh';
 const autoLabel=document.createElement('label');autoLabel.htmlFor=auto.id;autoLabel.textContent='Auto refresh every 5 minutes';
 refresh.parentElement?.append(search,autoLabel,auto);
 function renderItems(){
  container.replaceChildren();const term=search.value.trim().toLowerCase().slice(0,120);
  for(const item of lastItems){if(term&&!item.title.toLowerCase().includes(term))continue;
   let url;try{url=new URL(item.url);}catch{continue;}
   if(url.protocol!=='https:'||url.username||url.password||url.port||!['www.sec.gov','www.federalreserve.gov','stocktwits.com','www.stocktwits.com'].includes(url.hostname))continue;
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
 setInterval(()=>{if(auto.checked&&document.body.dataset.currentWorkspace==='news')refreshNews();},300000);
 const line=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;n.textContent=text;return n;};
 function sourceLink(){
  const link=document.getElementById('news-original');if(link)link.href=external[choose.value]||external.fed;
 }
 async function refreshNews(){
  if(controller)controller.abort();
  controller=new AbortController();
  const current=controller;
  sourceLink();status.textContent='Loading source-linked headlines…';container.replaceChildren();lastItems=[];
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:news',{detail:null}));
  try{
   let feed;
   if(location.protocol==='file:'&&typeof window.NewViewNative?.fetchPublicNews==='function'){
    if(choose.value==='stocktwits'){status.textContent='This publisher does not have a verified native RSS feed. Open the source below.';return;}
    feed=await new Promise((resolve,reject)=>{
     const id=Date.now()+Math.floor(Math.random()*1000);
     const timer=setTimeout(()=>{delete window.__newviewNewsResult;reject(Error('News timeout'));},20000);
     window.__newviewNewsResult=(received,data)=>{if(received!==id)return;clearTimeout(timer);delete window.__newviewNewsResult;if(data?.error)reject(Error(data.error));else resolve(data);};
     window.NewViewNative.fetchPublicNews(choose.value,id);
    });
   }else{
    const response=await fetch('/api/news?source='+encodeURIComponent(choose.value),{signal:current.signal});
    if(!response.ok)throw new Error('News service unavailable');
    feed=await response.json();
   }
   if(current!==controller)return;
   if(!Array.isArray(feed.items)||!feed.items.length){status.textContent='No headlines returned by this source. Check the original publisher.';return;}
   lastItems=feed.items.filter(item=>{try{const url=new URL(item.url);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&['www.sec.gov','www.federalreserve.gov','stocktwits.com','www.stocktwits.com'].includes(url.hostname)&&typeof item.title==='string'&&item.title.trim();}catch{return false;}}).slice(0,100);
   if(!lastItems.length){status.textContent='No valid announcements returned by this source';return;}
   renderItems();
   if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:news',{detail:{source:choose.value,count:container.children.length,headline:container.querySelector('.news-link')?.textContent||null}}));
   const fetched=new Date(typeof feed.fetchedAt==='number'?feed.fetchedAt:feed.fetchedAt);
   const age=Date.now()-fetched.getTime();
   const freshness=Number.isFinite(age)&&age>=0&&age<=3600000?'Recently fetched':'Fetch time unavailable or older than one hour';
   lastFetchLabel=freshness+' · fetched '+(Number.isFinite(fetched.getTime())?fetched.toLocaleString():'unknown');renderItems();
  }catch(err){
   if(current!==controller||err.name==='AbortError')return;
   status.textContent='Headlines unavailable. Open the official source below.';
  }
 }
 refresh.addEventListener('click',refreshNews);
 choose.addEventListener('change',refreshNews);
 sourceLink();
 document.addEventListener('newview:workspace-change',event=>{if(event.detail?.view==='news'&&!container.children.length)refreshNews();});
 if(document.body.dataset.currentWorkspace==='news')refreshNews();
})();
