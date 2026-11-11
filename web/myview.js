'use strict';
/* MyView: local-only dashboard pinning. Widget IDs are strictly allowlisted. */
(function(){
 const catalog=Object.freeze([
  Object.freeze({id:'market',title:'Markets',description:'Open Binance market charts and watchlists; quotes are not independently verified.',view:'markets',label:'Market charts'}),
  Object.freeze({id:'news',title:'Headlines',description:'Read source-linked financial announcements in Watch & News.',view:'media',section:'headlines',label:'Financial announcements'}),
  Object.freeze({id:'media',title:'Video & TV',description:'Open the video and TV section of Watch & News.',view:'media',section:'videos',label:'Video and TV'}),
  Object.freeze({id:'business',title:'Business',description:'Import your authorized business CSV locally to review KPIs.',view:'business',label:'Business KPIs'}),
  Object.freeze({id:'social',title:'Social',description:'Save and open public social profile bookmarks.',view:'social',label:'Social discovery'})
 ]);
 const ids=new Set(catalog.map(x=>x.id));
 // Daily Brief starts with markets, official headlines and local business KPIs.
 // Previously saved selections remain untouched by load().
 const defaults=['market','news','business'];
 const presets=Object.freeze({balanced:Object.freeze(['market','news','business']),markets:Object.freeze(['market','business','news']),media:Object.freeze(['media','news','social'])});
 function preset(name){return Object.hasOwn(presets,name)?[...presets[name]]:null;}
 const key='newview.myview.widgets.v1';
 const floatingVideoKey='newview.myview.floating-video.v1';
 function sanitize(input){
  if(!Array.isArray(input))return [...defaults];
  const out=[];for(const id of input){
   if(typeof id==='string'&&ids.has(id)&&!out.includes(id))out.push(id);
   if(out.length>=catalog.length)break;
  }return out;
 }
 function load(){try{const raw=localStorage.getItem(key);return raw===null?[...defaults]:sanitize(JSON.parse(raw));}catch{return [...defaults];}}
 function save(selected){const safe=sanitize(selected);try{localStorage.setItem(key,JSON.stringify(safe));}catch{}return safe;}
 function renderInstalledApps(){
  const status=document.getElementById('home-app-status'),grid=document.getElementById('home-installed-grid');
  if(!grid||!status)return;
  grid.replaceChildren();
  const native=[window.NewViewApps,window.NewViewNative].find(bridge=>bridge&&typeof bridge.listLaunchableApps==='function'&&typeof bridge.launchApp==='function');
  if(!native||typeof native.listLaunchableApps!=='function'||typeof native.launchApp!=='function'){
   status.textContent='Installed-app discovery is not supported by this APK yet.';return;
  }
  let apps;
  try{const response=native.listLaunchableApps();apps=typeof response==='string'?JSON.parse(response):response;}catch{status.textContent='Unable to read installed TV apps';return;}
  if(!Array.isArray(apps)){status.textContent='Invalid installed-app list';return;}
  const seen=new Set();let count=0;
  for(const app of apps){
   if(!app||typeof app.label!=='string'||typeof app.packageName!=='string'||!/^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/.test(app.packageName)||seen.has(app.packageName))continue;
   seen.add(app.packageName);if(++count>100)break;
   const button=document.createElement('button');button.type='button';button.className='home-installed-app';
   button.textContent=app.label.slice(0,50);button.title=app.packageName;
   button.addEventListener('click',()=>{try{native.launchApp(app.packageName);}catch{status.textContent='Could not launch '+app.label.slice(0,50);}});
   grid.append(button);
  }
  status.textContent=count?count+' launchable apps found on this TV':'No launchable TV apps returned';
 }
 function installHomeActions(){
  const status=document.getElementById('home-app-status');
  document.getElementById('home-refresh-apps')?.addEventListener('click',renderInstalledApps);
  renderInstalledApps();
  document.getElementById('home-pipetv')?.addEventListener('click',()=>{
   const bridge=window.NewViewNative;
   if(!bridge||typeof bridge.isPipeTvInstalled!=='function'||typeof bridge.openPipeTv!=='function'){if(status)status.textContent='PipeTv launch requires NewView on Android TV.';return;}
   try{if(!bridge.isPipeTvInstalled()){if(status)status.textContent='PipeTv is not installed on this TV.';return;}
   bridge.openPipeTv();if(status)status.textContent='Opening the separately installed PipeTv app.';}
   catch{if(status)status.textContent='Unable to launch PipeTv on this TV.';}
  });
  document.getElementById('home-guide')?.addEventListener('click',()=>{const el=document.getElementById('home-recovery');if(el)el.hidden=!el.hidden;});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHomeActions);else installHomeActions();
 const wallpaperKey='newview.home.wallpaper.v1',shadeKey='newview.home.wallpaper.shade.v1';
 function setWallpaper(data){
  if(data&&(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data)||data.length>1400000))return false;
  try{if(data)localStorage.setItem(wallpaperKey,data);else localStorage.removeItem(wallpaperKey);}catch{return false;}
  applyWallpaper(data);return true;
 }
 function applyWallpaper(data){
  document.body.classList.toggle('has-home-wallpaper',!!data);
  if(data)document.body.style.setProperty('--newview-wallpaper','url("'+data+'")');else document.body.style.removeProperty('--newview-wallpaper');
 }
 function installWallpaper(){
  const input=document.getElementById('wallpaper-file'),remove=document.getElementById('wallpaper-remove'),shade=document.getElementById('wallpaper-shade'),status=document.getElementById('wallpaper-status');
  if(!input||!remove||!shade||!status)return;
  try{applyWallpaper(localStorage.getItem(wallpaperKey));}catch{}
  const saved=(()=>{try{return localStorage.getItem(shadeKey)}catch{return null}})();
  if(['light','medium','dark'].includes(saved))shade.value=saved;
  document.body.dataset.wallpaperShade=shade.value;
  shade.addEventListener('change',()=>{document.body.dataset.wallpaperShade=shade.value;try{localStorage.setItem(shadeKey,shade.value);}catch{status.textContent='Shade not saved';}});
  input.addEventListener('change',()=>{
   const file=input.files?.[0];if(!file)return;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>950000){status.textContent='Choose a JPEG, PNG or WebP photo under 950 KB';input.value='';return;}
   const reader=new FileReader();reader.onload=()=>{status.textContent=setWallpaper(reader.result)?'Home photo saved on this device':'Photo could not be saved; try a smaller file';input.value='';};
   reader.onerror=()=>{status.textContent='Photo could not be read';};reader.readAsDataURL(file);
  });
  remove.addEventListener('click',()=>{status.textContent=setWallpaper(null)?'Home photo removed':'Could not clear stored photo';input.value='';});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installWallpaper);else installWallpaper();
 const root=document.getElementById('myview-grid'),editor=document.getElementById('myview-editor'),summary=document.getElementById('myview-count');
 const presetBar=document.getElementById('myview-presets');
 let chosen=load();
 let draggedWidget=null;
 const quoteHistory=new Map();
 const maxQuotePoints=36;
 function chartFor(symbol){
  const points=quoteHistory.get(symbol)||[];
  const container=document.createElement('div');container.className='myview-live-chart';
  const title=document.createElement('span');title.className='myview-chart-caption';title.textContent=points.length>1?'Observed quotes this session · '+symbol:'Waiting for at least two verified quotes';
  container.append(title);
  if(points.length<2)return container;
  const min=Math.min(...points),max=Math.max(...points),range=max-min||1;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 320 90');svg.setAttribute('role','img');svg.setAttribute('aria-label',symbol+' observed session quote trend');
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('fill','none');line.setAttribute('stroke','#24b9a2');line.setAttribute('stroke-width','3');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');line.setAttribute('points',points.map((v,i)=>(i*320/(points.length-1)).toFixed(1)+','+(82-(v-min)/range*74).toFixed(1)).join(' '));svg.append(line);container.append(svg);return container;
 }
 function refreshChart(){const card=root.querySelector('[data-widget="market"]');if(!card)return;card.querySelector('.myview-live-chart')?.replaceWith(chartFor(snapshots.market?.symbol||'Market'));}

 const snapshots={market:null,business:null,news:null,social:null};
 const preview={
  market:v=>v&&Number.isFinite(v.price)&&v.price>=0&&typeof v.symbol==='string'&&/^[A-Z0-9][A-Z0-9._/-]{0,23}$/.test(v.symbol.trim())?v.symbol.trim()+' · '+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v.price)+' '+(typeof v.currency==='string'&&/^[A-Z0-9]{2,12}$/.test(v.currency)?v.currency:'currency unavailable')+(Number.isSafeInteger(v.quoteTime)&&v.quoteTime>0&&v.quoteTime*1000<=Date.now()+300000&&v.quoteTime*1000>=Date.now()-86400000?' · quote '+new Date(v.quoteTime*1000).toLocaleTimeString():' · quote timestamp missing, stale or invalid; price freshness unconfirmed')+(v.source==='binance'?' · Binance source (not independently verified)':typeof v.source==='string'?' · source not independently verified':''):'No valid quote received',
  business:v=>v&&Number.isFinite(v.revenue)&&v.revenue>=0?'Revenue '+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v.revenue)+' · '+(Number.isFinite(v.cost)&&v.cost>=0&&v.revenue>0?'margin '+new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format((v.revenue-v.cost)/v.revenue*100)+'% · ':'')+(Number.isSafeInteger(v.orders)&&v.orders>=0?v.orders+' orders':'order count unavailable')+(typeof v.asOf==='string'&&v.asOf.replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,' ').trim()?' · '+v.asOf.replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,60):' · period unavailable')+' · local CSV (not independently verified)':'Upload a CSV in Business to view session KPIs',
  news:v=>v&&Number.isSafeInteger(v.count)&&v.count>0&&(v.source==='fed'||v.source==='sec')?v.count+' '+(v.source==='fed'?'Federal Reserve':'SEC')+' announcements'+(typeof v.headline==='string'&&v.headline.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,' ').trim()?' · '+v.headline.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,180):''):'Load verified official announcements in Watch & News',
  social:v=>v&&Number.isSafeInteger(v.count)&&v.count>=0?v.count+' locally saved public profiles':'No verified public-profile count available',
  media:()=> 'Open a video in Watch & News; no playback is started here'
 };
 if(!root||!editor){window.NewViewPersonal={catalog,presets,preset,sanitize,load,save,preview};return;}
 function text(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;return el;}
 function updateMarketSourceLink(){
  const link=root.querySelector('[data-widget="market"] [data-source-link="market"]');
  if(!link)return;
  const quote=snapshots.market;
  const valid=quote&&quote.source==='binance'&&Number.isFinite(quote.price)&&quote.price>=0&&typeof quote.symbol==='string'&&/^[A-Z0-9][A-Z0-9._/-]{0,23}$/.test(quote.symbol.trim())&&typeof quote.currency==='string'&&/^[A-Z0-9]{2,12}$/.test(quote.currency)&&Number.isSafeInteger(quote.quoteTime)&&quote.quoteTime>0&&quote.quoteTime*1000<=Date.now()+300000&&quote.quoteTime*1000>=Date.now()-86400000;
  link.hidden=!valid;
  if(!valid){link.removeAttribute('href');link.textContent='Source unavailable';return;}
  link.href='https://www.binance.com/en/markets';
  link.textContent='Binance markets (general reference, not quote verification)';
 }
 function updateNewsSourceLink(){
  const link=root.querySelector('[data-widget="news"] [data-source-link="news"]');
  if(!link)return;
  const snapshot=snapshots.news;
  const verified=Number.isSafeInteger(snapshot?.count)&&snapshot.count>0&&(snapshot.source==='fed'||snapshot.source==='sec');
  link.hidden=!verified;
  if(!verified){link.removeAttribute('href');link.textContent='Source unavailable';return;}
  const fed=snapshot.source==='fed';
  link.href=fed?'https://www.federalreserve.gov/newsevents/pressreleases.htm':'https://www.sec.gov/newsroom';
  link.textContent=fed?'Federal Reserve announcements (publisher index)':'SEC newsroom (publisher index)';
 }
 function render(){
  root.replaceChildren();editor.replaceChildren();
  if(summary)summary.textContent=chosen.length+' of '+catalog.length+' widgets selected · saved on this device';
  for(const widget of catalog){
   const row=document.createElement('label');row.className='myview-option';
   const input=document.createElement('input');input.type='checkbox';input.checked=chosen.includes(widget.id);
   input.setAttribute('aria-label','Show '+widget.title+' widget');
   input.addEventListener('change',()=>{chosen=save(input.checked?[...chosen,widget.id]:chosen.filter(x=>x!==widget.id));render();const restored=[...editor.querySelectorAll('input[type="checkbox"]')].find(el=>el.getAttribute('aria-label')==='Show '+widget.title+' widget');restored?.focus();});
   row.append(input,text('span','',widget.title));editor.appendChild(row);
  }
  if(!chosen.length){root.append(text('p','myview-empty','No widgets selected. Choose a widget above to customize this dashboard.'));return;}
  for(const id of chosen){
   const widget=catalog.find(x=>x.id===id);
   const item=document.createElement('article');item.className='myview-widget';
   item.dataset.widget=id;
   item.draggable=true;
   item.setAttribute('aria-label',widget.title+' widget. Use move earlier or later buttons for keyboard and TV.');
   item.addEventListener('dragstart',e=>{draggedWidget=id;e.dataTransfer?.setData('text/plain',id);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';});
   item.addEventListener('dragend',()=>{draggedWidget=null;});
   item.addEventListener('dragover',e=>{if(draggedWidget&&e.dataTransfer?.types.includes('text/plain'))e.preventDefault();});
   item.addEventListener('drop',e=>{if(!draggedWidget)return;e.preventDefault();const from=draggedWidget;draggedWidget=null;if(!ids.has(from)||!chosen.includes(from)||from===id)return;const next=chosen.filter(x=>x!==from);next.splice(next.indexOf(id),0,from);chosen=save(next);render();root.querySelector('[data-widget="'+from+'"] button')?.focus();});
   const heading=text('h3','',widget.title);
   const eyebrow=text('div','shell-eyebrow',widget.label);
   const description=text('p','',widget.description);
   const insight=text('p','myview-insight',preview[id](snapshots[id]));
   insight.setAttribute('aria-label',widget.title+' source snapshot');
   insight.dataset.snapshot=id;
   insight.setAttribute('aria-live','off');
   const actions=document.createElement('div');actions.className='myview-widget-actions';
   const button=text('button','shell-primary','Open '+widget.title);
   button.type='button';button.setAttribute('aria-label','Open NewView'+widget.title);
   button.addEventListener('click',()=>{window.NewViewShell?.select(widget.view);if(widget.section)window.NewViewWatch?.select(widget.section);});
   const up=text('button','','↑');up.type='button';up.title='Move '+widget.title+' earlier';up.setAttribute('aria-label','Move '+widget.title+' earlier');
   const down=text('button','','↓');down.type='button';down.title='Move '+widget.title+' later';down.setAttribute('aria-label','Move '+widget.title+' later');
   const index=chosen.indexOf(id);up.disabled=index===0;down.disabled=index===chosen.length-1;
   function move(delta){const next=[...chosen],at=next.indexOf(id);if(at+delta<0||at+delta>=next.length)return;const focused=document.activeElement;const focusKind=focused===up?'up':focused===down?'down':focused===button?'open':focused?.dataset?.sourceLink||null;[next[at],next[at+delta]]=[next[at+delta],next[at]];chosen=save(next);render();const moved=root.querySelector('[data-widget="'+id+'"]');const selector=focusKind==='up'||focusKind==='down'?'[data-reorder="'+focusKind+'"]':focusKind==='market'||focusKind==='news'?'[data-source-link="'+focusKind+'"]':'.shell-primary';const target=moved?.querySelector(selector);if(target&&!target.disabled&&!target.hidden)target.focus();else moved?.querySelector('button:not([disabled])')?.focus();}
   up.dataset.reorder='up';down.dataset.reorder='down';
   up.addEventListener('click',()=>move(-1));down.addEventListener('click',()=>move(1));
   // Alt+ArrowUp/Down reorders the focused card without trapping normal TV D-pad navigation.
   item.addEventListener('keydown',event=>{
    if(!event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;
    const delta=event.key==='ArrowUp'?-1:1;
    if(index+delta<0||index+delta>=chosen.length)return;
    event.preventDefault();move(delta);
   });
   actions.append(button,up,down);
   if(id==='market'){
    const source=text('a','myview-source-link','Source unavailable');
    source.hidden=true;source.target='_blank';source.rel='noopener noreferrer';
    source.dataset.sourceLink='market';source.setAttribute('aria-label','Open Binance markets general reference; does not verify displayed quote');
    actions.append(source);
   }
   if(id==='news'){
    const source=text('a','myview-source-link','SEC source');
    source.hidden=true;source.removeAttribute('href');source.target='_blank';source.rel='noopener noreferrer';
    source.dataset.sourceLink='news';source.setAttribute('aria-label','Open official news publisher index; not a direct link to the displayed headline');
    actions.append(source);
   }
item.append(eyebrow,heading,description,insight);
   if(id==='market')item.append(chartFor(snapshots.market?.symbol||'Market'));
   if(id==='media'){
    const player=document.createElement('div');player.className='myview-video-panel';
    const label=text('p','','Floating video supports official YouTube embeds on web. Native IPTV requires Android TV support.');
    const open=text('button','shell-primary','Open video player');open.type='button';open.addEventListener('click',()=>{window.NewViewShell?.select('media');window.NewViewWatch?.select('videos');});
    const floating=text('button','','Floating YouTube video');floating.type='button';floating.addEventListener('click',()=>{
      const raw=window.prompt('Enter an official YouTube video URL (HTTPS):',(()=>{try{return localStorage.getItem(floatingVideoKey)||''}catch{return ''}})());
      if(raw===null)return;
      const parsed=window.NewViewMedia?.parse(raw);
      if(!parsed){label.textContent='Enter a valid official YouTube video URL.';return;}
      try{localStorage.setItem(floatingVideoKey,raw)}catch{}
      const old=player.querySelector('iframe');if(old)old.remove();
      if(location.protocol==='file:'){label.textContent='Embedded playback is not supported in this Android TV APK. Use the native player or external link.';return;}
      const frame=document.createElement('iframe');frame.title='Floating YouTube video';frame.src=parsed.embed;frame.allow='encrypted-media; picture-in-picture';frame.allowFullscreen=true;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.style.cssText='width:100%;aspect-ratio:16/9;border:0;border-radius:9px';player.append(frame);
      label.textContent='Official YouTube embed; advertisements may appear.';
    });
    player.append(label,open,floating);item.append(player);
   }
   item.append(actions);root.append(item);
  }
  updateNewsSourceLink();updateMarketSourceLink();
 }
 function installPresets(){if(!presetBar)return;for(const [name,label] of [['balanced','Balanced'],['markets','Markets first'],['media','Watch & News first']]){const button=text('button','',''+label);button.type='button';button.dataset.preset=name;button.addEventListener('click',()=>{chosen=save(preset(name));render();button.focus();});presetBar.append(button);}}
 document.getElementById('myview-reset')?.addEventListener('click',()=>{chosen=save(defaults);render();});
 for(const id of ['market','business','news','social'])window.addEventListener('newview:'+id,event=>{
  const next=event.detail&&typeof event.detail==='object'?event.detail:null;
  if(id!=='news'&&id!=='market'&&preview[id](next)===preview[id](snapshots[id]))return; // Market and news source-link validity may change independently of preview text.
  snapshots[id]=next;
  if(id==='market'&&next&&typeof next.symbol==='string'&&Number.isFinite(next.price)&&Number.isFinite(next.quoteTime)){
   const key=next.symbol.slice(0,24);const points=quoteHistory.get(key)||[];
   if(!points.length||points[points.length-1]!==next.price){points.push(next.price);if(points.length>maxQuotePoints)points.shift();quoteHistory.set(key,points);}
   refreshChart();
  }
  // Update only the live insight text: rebuilding the grid would steal TV remote/keyboard focus.
  const insight=root.querySelector('[data-widget="'+id+'"] .myview-insight');
  if(insight)insight.textContent=preview[id](next);
  if(id==='news')updateNewsSourceLink();
  if(id==='market')updateMarketSourceLink();
 });
 // A quote can become stale while the dashboard stays open without receiving another event.
 // Recheck time-based validity without rebuilding cards or disrupting remote focus.
 function refreshMarketAge(){
  const quote=snapshots.market;
  if(!quote)return;
  const live=root.querySelector('[data-widget="market"] [data-snapshot="market"]');
  const updated=preview.market(quote);
  if(live&&live.textContent!==updated)live.textContent=updated;
  updateMarketSourceLink();
 }
 const freshnessTimer=setInterval(refreshMarketAge,60000);
 freshnessTimer.unref?.();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshMarketAge();});
 // Android TV WebViews may resume from the background without a visibilitychange event.
 // Refresh source eligibility on page restoration and window focus as well.
 window.addEventListener('pageshow',refreshMarketAge);
 window.addEventListener('focus',refreshMarketAge);
 window.NewViewPersonal={catalog,presets,preset,sanitize,load,save,render,preview};
 installPresets();render();
})();
