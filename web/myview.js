'use strict';
/* MyView: local-only dashboard pinning. Widget IDs are strictly allowlisted. */
(function(){
 const catalog=Object.freeze([
  Object.freeze({id:'market',title:'Markets',description:'Open verified Binance market charts and watchlists.',view:'markets',label:'Market charts'}),
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
  const native=window.NewViewApps||window.NewViewNative;
  if(!native||typeof native.listLaunchableApps!=='function'||typeof native.launchApp!=='function'){
   status.textContent='Installed-app discovery is not supported by this APK yet.';return;
  }
  let apps;
  try{apps=JSON.parse(native.listLaunchableApps());}catch{status.textContent='Unable to read installed TV apps';return;}
  if(!Array.isArray(apps)){status.textContent='Invalid installed-app list';return;}
  const seen=new Set();let count=0;
  for(const app of apps){
   if(!app||typeof app.label!=='string'||typeof app.packageName!=='string'||!/^([A-Za-z][A-Za-z0-9_]*\\.)+[A-Za-z][A-Za-z0-9_]*$/.test(app.packageName)||seen.has(app.packageName))continue;
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
   if(!bridge.isPipeTvInstalled()){if(status)status.textContent='PipeTv is not installed on this TV.';return;}
   bridge.openPipeTv();if(status)status.textContent='Opening the separately installed PipeTv app.';
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
 const snapshots={market:null,business:null,news:null,social:null};
 const preview={
  market:v=>v&&Number.isFinite(v.price)&&v.price>=0&&typeof v.symbol==='string'&&/^[A-Z0-9][A-Z0-9._/-]{0,23}$/.test(v.symbol.trim())?v.symbol.trim()+' · '+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v.price)+' '+(typeof v.currency==='string'&&/^[A-Z0-9]{2,12}$/.test(v.currency)?v.currency:'currency unavailable')+(Number.isSafeInteger(v.quoteTime)&&v.quoteTime>0&&v.quoteTime*1000<=Date.now()+300000&&v.quoteTime*1000>=Date.now()-86400000?' · quote '+new Date(v.quoteTime*1000).toLocaleTimeString():' · quote time unavailable'):'No verified quote received',
  business:v=>v&&Number.isFinite(v.revenue)&&v.revenue>=0?'Revenue '+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v.revenue)+' · '+(Number.isFinite(v.cost)&&v.cost>=0&&v.revenue>0?'margin '+new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format((v.revenue-v.cost)/v.revenue*100)+'% · ':'')+(Number.isSafeInteger(v.orders)&&v.orders>=0?v.orders+' orders':'order count unavailable')+(typeof v.asOf==='string'&&v.asOf.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim()?' · '+v.asOf.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim().slice(0,60):' · period unavailable'):'Upload a CSV in Business to view session KPIs',
  news:v=>v&&Number.isSafeInteger(v.count)&&v.count>0&&(v.source==='fed'||v.source==='sec')?v.count+' '+(v.source==='fed'?'Federal Reserve':'SEC')+' announcements'+(typeof v.headline==='string'&&v.headline.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim()?' · '+v.headline.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180):''):'Load verified official announcements in Watch & News',
  social:v=>v&&Number.isSafeInteger(v.count)&&v.count>=0?v.count+' locally saved public profiles':'No verified public-profile count available',
  media:()=> 'Open a video in Watch & News; no playback is started here'
 };
 if(!root||!editor){window.NewViewPersonal={catalog,presets,preset,sanitize,load,save,preview};return;}
 function text(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;return el;}
 function updateMarketSourceLink(){
  const link=root.querySelector('[data-widget="market"] [data-source-link="market"]');
  if(!link)return;
  const quote=snapshots.market;
  const valid=quote&&Number.isFinite(quote.price)&&quote.price>=0&&typeof quote.symbol==='string'&&/^[A-Z0-9][A-Z0-9._/-]{0,23}$/.test(quote.symbol.trim());
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
  link.textContent=fed?'Federal Reserve source':'SEC source';
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
   function move(delta){const next=[...chosen],at=next.indexOf(id);if(at+delta<0||at+delta>=next.length)return;[next[at],next[at+delta]]=[next[at+delta],next[at]];chosen=save(next);render();const moved=root.querySelector('[data-widget="'+id+'"]');const target=moved?.querySelector(delta<0?'[data-reorder="up"]':'[data-reorder="down"]');if(target&&!target.disabled)target.focus();else moved?.querySelector('button:not([disabled])')?.focus();}
   up.dataset.reorder='up';down.dataset.reorder='down';
   up.addEventListener('click',()=>move(-1));down.addEventListener('click',()=>move(1));
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
    source.dataset.sourceLink='news';source.setAttribute('aria-label','Open official news publisher');
    actions.append(source);
   }
   item.append(eyebrow,heading,description,insight,actions);root.append(item);
  }
  updateNewsSourceLink();updateMarketSourceLink();
 }
 function installPresets(){if(!presetBar)return;for(const [name,label] of [['balanced','Balanced'],['markets','Markets first'],['media','Watch & News first']]){const button=text('button','',''+label);button.type='button';button.dataset.preset=name;button.addEventListener('click',()=>{chosen=save(preset(name));render();button.focus();});presetBar.append(button);}}
 document.getElementById('myview-reset')?.addEventListener('click',()=>{chosen=save(defaults);render();});
 for(const id of ['market','business','news','social'])window.addEventListener('newview:'+id,event=>{
  const next=event.detail&&typeof event.detail==='object'?event.detail:null;
  if(id!=='news'&&id!=='market'&&preview[id](next)===preview[id](snapshots[id]))return; // Market and news source-link validity may change independently of preview text.
  snapshots[id]=next;
  // Refresh only the affected text: rebuilding cards on every quote disrupts TV/keyboard focus.
  const live=root.querySelector('[data-widget="'+id+'"] [data-snapshot="'+id+'"]');
  if(live)live.textContent=preview[id](next);
  if(id==='news')updateNewsSourceLink();
  if(id==='market')updateMarketSourceLink();
 });
 window.NewViewPersonal={catalog,presets,preset,sanitize,load,save,render,preview};
 installPresets();render();
})();
