'use strict';
/* One accessible four-destination shell. Controllers remain in their original
 * modules; Home remembers 1–4 user-selected destinations on this device. */
(function(){
 const KEY='newview.home.boxes.v2',COUNT_KEY='newview.home.box-count.v2';
 const choices=[
  {id:'markets',label:'Markets',sub:'Binance charts and watchlists',section:'read'},
  {id:'iptv',label:'IPTV',sub:'Live public TV directory',section:'watch'},
  {id:'youtube',label:'YouTube',sub:'Browse YouTube in NewView',section:'watch'},
  {id:'news',label:'News',sub:'Worldwide publisher headlines',section:'read'},
  {id:'devices',label:'Mirroring',sub:'Phone and TV casting',section:'watch'}
 ];
 function safeItems(value){return Array.isArray(value)?[...new Set(value.filter(x=>choices.some(c=>c.id===x)))].slice(0,4):[];}
 function read(){
  try{return {items:safeItems(JSON.parse(localStorage.getItem(KEY)||'["markets","iptv","news","devices"]')),count:Math.max(1,Math.min(4,Number(localStorage.getItem(COUNT_KEY))||4))};}
  catch{return {items:['markets','iptv','news','devices'],count:4};}
 }
 function store(state){try{localStorage.setItem(KEY,JSON.stringify(state.items));localStorage.setItem(COUNT_KEY,String(state.count));}catch{}}
 function install(){
  const main=document.querySelector('body > main'),oldNav=document.getElementById('workspace-switcher'),
   home=document.querySelector('[data-workspace="myview"]'),header=main?.querySelector(':scope > header'),
   settings=document.getElementById('newview-settings');
  if(!main||!oldNav||!home||!header||document.getElementById('nv-simple-nav'))return;
  document.body.classList.add('nv-simple');
  const el=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=text;return n;};
  const nav=el('nav','nv-simple-nav');nav.id='nv-simple-nav';nav.setAttribute('aria-label','NewView main navigation');
  const sections=[['home','Home'],['watch','Watch'],['read','Discover'],['customize','Settings']];
  const buttons=new Map();let active='home',state=read();
  // Respect the saved 1–4 shortcut preference on Home.
  const content=el('section','nv-simple-home');content.id='nv-simple-home';content.setAttribute('aria-label','Personalized Home');
  const grid=el('div','nv-simple-grid');
  grid.id='nv-simple-grid';
  // Home is a fixed three-destination command deck; the other sections remain available.
  const homeNews=el('section','nv-home-top-news');homeNews.id='nv-home-top-news';homeNews.setAttribute('aria-label','Suggested top news');
  const newsHeading=el('div','nv-home-news-heading');
  newsHeading.append(el('strong','','Hot news'));
  const moreNews=el('button','','More headlines');moreNews.type='button';moreNews.addEventListener('click',()=>show('read'));
  newsHeading.append(moreNews);
  const newsStrip=el('div','nv-home-news-strip');newsStrip.setAttribute('aria-label','Latest publisher stories');
  homeNews.append(newsHeading,newsStrip);
  const homeLower=el('div','nv-home-lower');homeLower.id='nv-home-lower';
  const mainChart=el('section','nv-home-chart');mainChart.id='nv-home-chart';mainChart.setAttribute('aria-label','Market charts or article reader');
  const chartHeading=el('div','nv-home-chart-head');
  chartHeading.append(el('strong','','Charts'));
  const openCharts=el('button','','Open charts');openCharts.type='button';openCharts.addEventListener('click',()=>window.NewViewShell?.select?.('markets'));
  const PANEL_KEY='newview.home.panel-layout.v1';
  let layoutPrefs={order:'chart-first',width:'balanced'};
  try{const saved=JSON.parse(localStorage.getItem(PANEL_KEY)||'{}');
   if(['chart-first','video-first'].includes(saved.order))layoutPrefs.order=saved.order;
   if(['balanced','left-wide','right-wide'].includes(saved.width))layoutPrefs.width=saved.width;
  }catch{}
  const swapPanels=el('button','nv-home-swap-panels','Swap panels');swapPanels.type='button';
  swapPanels.setAttribute('aria-label','Swap chart and video panel positions');
  const panelWidth=el('select','nv-home-panel-width');panelWidth.setAttribute('aria-label','Home panel widths');
  for(const [value,label] of [['balanced','Balanced'],['left-wide','Left panel wider'],['right-wide','Right panel wider']]){
   const option=el('option','',label);option.value=value;panelWidth.append(option);
  }
  function applyPanelLayout(){
   homeLower.dataset.panelOrder=layoutPrefs.order;
   homeLower.dataset.panelWidth=layoutPrefs.width;
   panelWidth.value=layoutPrefs.width;
   swapPanels.setAttribute('aria-pressed',String(layoutPrefs.order==='video-first'));
   try{localStorage.setItem(PANEL_KEY,JSON.stringify(layoutPrefs));}catch{}
   window.dispatchEvent?.(new Event('resize'));
  }
  swapPanels.addEventListener('click',()=>{layoutPrefs.order=layoutPrefs.order==='chart-first'?'video-first':'chart-first';applyPanelLayout();});
  panelWidth.addEventListener('change',()=>{layoutPrefs.width=panelWidth.value;applyPanelLayout();});
  chartHeading.append(openCharts,swapPanels,panelWidth);
  mainChart.append(chartHeading);
  applyPanelLayout();
  const market=document.getElementById('market-shell');
  const marketAnchor=document.createComment('Full market workspace');
  market?.before(marketAnchor);
  function placeChart(atHome){
   if(!market)return;
   if(atHome){
    mainChart.append(market);market.hidden=false;
    const workspace=market.querySelector('.workspace');if(workspace)workspace.hidden=false;
    const board=market.querySelector('#stock-board');if(board)board.hidden=true;
   }else marketAnchor.after(market);
   requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
  const articlePanel=el('section','nv-home-article');articlePanel.id='nv-home-article';articlePanel.hidden=true;
  articlePanel.setAttribute('aria-label','Readable article inside Home');
  const articleToolbar=el('div','nv-home-article-toolbar');
  const backChart=el('button','','← Charts');backChart.type='button';backChart.addEventListener('click',()=>{window.NewViewInternalBrowser?.close?.();articlePanel.hidden=true;mainChart.hidden=false;});
  document.addEventListener('newview:browser-close',event=>{if(event.detail?.area==='home'){articlePanel.hidden=true;mainChart.hidden=false;}});
  const articleSize=el('select');articleSize.setAttribute('aria-label','Article panel size');
  for(const [value,label] of [['normal','Normal reader'],['wide','Wide reader'],['large','Large reader']]){
   const opt=el('option','',label);opt.value=value;articleSize.append(opt);
  }
  articleSize.addEventListener('change',()=>{homeLower.dataset.articleSize=articleSize.value;});
  const fullArticle=el('button','','Full publisher page');fullArticle.type='button';
  const articleTitle=el('h2'),articleInfo=el('p','nv-home-article-meta'),articleBody=el('p','nv-home-article-body');
  let articleUrl='';
  function openPublisher(){
   if(!articleUrl)return;
   if(!window.NewViewInternalBrowser?.open?.(articleUrl,{area:'home'})){
    if(typeof window.NewViewNative?.openNewsBrowser==='function')window.NewViewNative.openNewsBrowser(articleUrl);
    else window.open(articleUrl,'_blank','noopener,noreferrer');
   }
  }
  fullArticle.addEventListener('click',openPublisher);
  articleToolbar.append(backChart,articleSize,fullArticle);
  articlePanel.append(articleToolbar,articleTitle,articleInfo,articleBody);
  function readAtHome(item){
   if(!item||typeof item.url!=='string'||!item.url.startsWith('https://'))return;
   articleUrl=item.url;articleTitle.textContent=item.title;
   articleInfo.textContent=item.source+(item.publishedAt?' · '+new Date(item.publishedAt).toLocaleString():'');
   articleBody.textContent=item.summary||'Publisher feed excerpt unavailable. Open publisher for the complete article.';
   mainChart.hidden=true;articlePanel.hidden=false;homeLower.dataset.articleSize=articleSize.value;
   const browser=window.NewViewInternalBrowser;
   if(browser){
    const isNative=typeof window.NewViewNative?.openNewsBrowser==='function';
    const inBox=typeof window.NewViewNative?.openBoxBrowser==='function';
    articleTitle.hidden=inBox||!isNative;articleInfo.hidden=inBox||!isNative;articleBody.hidden=inBox||!isNative;
    browser.open(item.url,{area:'home',title:item.title,summary:item.summary||''});
   }else{articleTitle.hidden=false;articleInfo.hidden=false;articleBody.hidden=false;}
   articlePanel.scrollIntoView?.({block:'start',behavior:'smooth'});
  }
  const featured=el('section','nv-home-featured');featured.id='nv-home-featured';featured.setAttribute('aria-label','Featured channel and floating cast');
  const featuredHeading=el('div','nv-home-featured-heading');featuredHeading.append(el('strong','','Featured channel · Video cast'));
  const featuredSelect=el('select');featuredSelect.setAttribute('aria-label','Featured IPTV channel');
  const featuredPlay=el('button','','▶ Play in floating video');featuredPlay.type='button';
  const featuredStatus=el('p','nv-home-featured-status','Choose a public channel. Untested streams are not guaranteed to play.');
  featuredHeading.querySelector('strong').textContent='Suggested live TV';
  const featuredLabel=el('label','nv-home-channel-label','Live channel');
  featuredLabel.append(featuredSelect);
  const preferences=el('div','nv-home-recommendation-controls');
  const language=el('select');language.setAttribute('aria-label','Preferred channel language');
  for(const [value,label] of [['any','Any language'],['english','English'],['arabic','Arabic'],['spanish','Spanish'],['french','French']]){
   const option=el('option','',label);option.value=value;language.append(option);
  }
  const interest=el('select');interest.setAttribute('aria-label','Preferred channel topic');
  for(const [value,label] of [['all','All interests'],['news','News'],['business','Business'],['sports','Sports'],['music','Music']]){
   const option=el('option','',label);option.value=value;interest.append(option);
  }
  const PREF_KEY='newview.recommendation.preferences.v1';
  try{const prefs=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');
   if([...language.options].some(o=>o.value===prefs.language))language.value=prefs.language;
   if([...interest.options].some(o=>o.value===prefs.interest))interest.value=prefs.interest;
  }catch{}
  const savePrefs=()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify({language:language.value,interest:interest.value}));}catch{}syncFeatured();};
  language.addEventListener('change',savePrefs);interest.addEventListener('change',savePrefs);
  preferences.append(language,interest);
  const recentHeading=el('h4','','Continue watching');
  const recentList=el('div','nv-home-recent');recentList.setAttribute('aria-label','Recently confirmed live TV channels');
  const clearRecent=el('button','nv-home-clear-history','Clear viewing history');clearRecent.type='button';
  clearRecent.addEventListener('click',()=>window.NewViewViewing?.clear?.());
  function renderRecent(){
   recentList.replaceChildren();
   const entries=window.NewViewViewing?.read?.()||[];
   if(!entries.length){recentList.append(el('p','','No recently played channels on this device.'));clearRecent.hidden=true;return;}
   clearRecent.hidden=false;
   for(const entry of entries.slice(0,3)){
    const button=el('button','nv-home-recent-item',entry.name+' · Continue');button.type='button';
    button.addEventListener('click',()=>{featuredSelect.value=entry.url;
     if(!window.NewViewCast?.playIPTV?.(entry.url))featuredStatus.textContent='Unable to start this channel. Choose another stream.';
    });
    recentList.append(button);
   }
  }
  window.addEventListener('newview:viewing-history',()=>{renderRecent();syncFeatured();});
  featured.append(featuredHeading,featuredLabel,preferences,featuredPlay,featuredStatus,recentHeading,recentList,clearRecent);
  renderRecent();
  const playerDock=document.getElementById('newview-cast-dock');
  if(playerDock)featured.append(playerDock);
  function syncFeatured(){
   const catalog=document.querySelector('#newview-channel-directory select[aria-label="Available IPTV channels"]');
   if(!catalog||!catalog.options.length){featuredStatus.textContent='No channels loaded yet. Open Watch to refresh the channel directory.';return;}
   const old=featuredSelect.value;
   featuredSelect.replaceChildren();
   const pool=[...catalog.options].filter(o=>o.value.startsWith('https://'));
   const ranked=window.NewViewChannelPicks?.rank?.(pool.map(o=>({url:o.value,name:o.textContent||'Public channel'})));
   const candidates=ranked?ranked.map(c=>({value:c.url,textContent:c.name})):pool;
   const prior=new Set();let count=0;
   for(const opt of candidates){
    if(prior.has(opt.value))continue;prior.add(opt.value);
    const option=el('option','',opt.textContent||'Public channel');option.value=opt.value;featuredSelect.append(option);
    if(++count>=120)break;
   }
   if([...featuredSelect.options].some(o=>o.value===old))featuredSelect.value=old;
   else {
    const checked=[...featuredSelect.options].find(o=>window.NewViewSourceMonitor?.status?.('iptv',o.value)==='ok');
    if(checked)featuredSelect.value=checked.value;
   }
   window.NewViewCast?.setChannels?.([...featuredSelect.options].map(o=>({name:o.textContent,url:o.value})));
   const suggestions=[...featuredSelect.options].map(o=>({name:o.textContent,url:o.value}));
   // Do not auto-play merely because a background probe decoded data.
   // The user must explicitly choose Play before network media starts.
   window.NewViewChannelPicks?.setCatalog?.(suggestions);
   featuredStatus.textContent=featuredSelect.options.length
    ? 'Change channels inside the video player. Availability depends on the broadcaster.'
    : 'No playable channel candidates loaded yet. Open Watch and refresh the directory.';
  }
  featuredPlay.addEventListener('click',()=>{
   if(!featuredSelect.value){featuredStatus.textContent='Choose a channel first.';return;}
   if(window.NewViewCast?.playIPTV?.(featuredSelect.value)){featuredStatus.textContent='Floating video opened. Playback confirmation depends on the broadcaster.';}
   else featuredStatus.textContent='This stream cannot be played in the floating viewer; try another channel.';
  });
  window.addEventListener('newview:channel-check',()=>{if(active==='home')syncFeatured();});
  function populateTopNews(){
   const items=window.NewViewNewsReader?.getItems?.()||[];
   newsStrip.replaceChildren();
   const latest=[...items].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,4);
   if(!latest.length){const offline=typeof navigator!=='undefined'&&!navigator.onLine;newsStrip.append(el('p','nv-home-news-empty',offline?'Offline — headlines unavailable. Reconnect to refresh.':'No publisher headlines available yet. Open Read to retry.'));return;}
   for(const item of latest){
    const btn=el('button','nv-home-news-story');btn.type='button';
    const when=Date.parse(item.publishedAt||'');
    const freshness=Number.isFinite(when)?new Date(when).toLocaleString():'Update time unavailable';
    btn.append(el('strong','',item.title),el('small','',item.source+' · '+freshness),el('small','',item.summary||'Open publisher to read the story'));
    btn.addEventListener('click',()=>readAtHome(item));
    newsStrip.append(btn);
   }
  }
  window.addEventListener('newview:news',populateTopNews);
  window.addEventListener('newview:source-status',e=>{if(e.detail?.kind==='iptv')syncFeatured();});
  const originalDirectory=document.getElementById('newview-channel-directory');
  if(originalDirectory){
   const select=originalDirectory.querySelector('select[aria-label="Available IPTV channels"]');
   if(select)new MutationObserver(syncFeatured).observe(select,{childList:true});
  }
  homeLower.append(mainChart,articlePanel,featured);
  content.append(homeNews,homeLower);home.prepend(content);
  populateTopNews();syncFeatured();

  const watch=el('section','nv-hub-panel');watch.id='nv-watch-hub';watch.hidden=true;
  const watchActions=el('div','nv-hub-grid');watch.append(watchActions);home.append(watch);
  const readPanel=el('section','nv-hub-panel');readPanel.id='nv-read-hub';readPanel.hidden=true;
  const readActions=el('div','nv-hub-grid');readPanel.append(readActions);home.append(readPanel);
  const customize=el('section','nv-hub-panel');customize.id='nv-customize-hub';customize.hidden=true;
  const selectCount=el('select','nv-custom-count');selectCount.id='nv-custom-count';selectCount.setAttribute('aria-label','Home box count');
  for(let n=1;n<=4;n++){const option=el('option','',n+' shortcut'+(n===1?'':'s'));option.value=String(n);selectCount.append(option);}
  selectCount.addEventListener('change',()=>{state.count=Number(selectCount.value);store(state);render();});
  const optionGrid=el('div','nv-custom-options');
  customize.append(selectCount,optionGrid);home.append(customize);
  const now=el('p','nv-custom-state');now.setAttribute('role','status');customize.append(now);
  const settingsIntro=el('p','nv-custom-settings-help','Photo, advanced source options and screen layout settings are below.');
  customize.append(settingsIntro);
  function syncNav(){
   for(const [id,button] of buttons){const on=id===active;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));if(on)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');button.tabIndex=on?0:-1;}
   document.body.dataset.simpleSection=active;
  }
  function navigate(target){
   if(target==='markets'){window.NewViewShell?.select?.('markets');return;}
   if(target==='iptv'){window.NewViewShell?.select?.('media');window.NewViewWatch?.select?.('channels');return;}
   if(target==='news'){window.NewViewShell?.select?.('media');window.NewViewWatch?.select?.('headlines');return;}
   if(target==='devices'){window.NewViewShell?.select?.('devices');window.NewViewCast?.open?.();return;}
   if(target==='youtube'){
    show('watch');window.NewViewYouTube?.open?.();return;
   }
  }
  function actionTile(item){
   const b=el('button','nv-simple-tile');b.type='button';b.dataset.simpleTarget=item.id;
   const icon=el('span','nv-simple-tile-icon',({markets:'▤',iptv:'▣',youtube:'▶',news:'▥',devices:'▧'})[item.id]);icon.setAttribute('aria-hidden','true');
   const label=el('span','nv-simple-tile-text');label.append(el('strong','',item.label),el('small','',item.sub));
   b.append(icon,label);b.addEventListener('click',()=>navigate(item.id));return b;
  }
  function render(){
   grid.replaceChildren();const chosen=[...new Set([...state.items,...['markets','iptv','news']])].slice(0,state.count);
   for(const id of chosen){const item=choices.find(x=>x.id===id);if(item)grid.append(actionTile(item));}
   if(!chosen.length)grid.append(el('p','','Choose a box in Customize.'));
   grid.dataset.boxCount=String(chosen.length);
   optionGrid.replaceChildren();
   for(const item of choices){
    const label=el('label','nv-custom-choice'),check=el('input');check.type='checkbox';check.value=item.id;check.checked=state.items.includes(item.id);
    check.addEventListener('change',()=>{
     if(check.checked){if(state.items.length>=4){check.checked=false;now.textContent='Maximum of four selected boxes';return;}state.items.push(item.id);}
     else state.items=state.items.filter(x=>x!==item.id);
     store(state);render();
    });
    label.append(check,el('span','',item.label));optionGrid.append(label);
   }
   selectCount.value=String(state.count);
   now.textContent='Home shows '+chosen.length+' shortcut'+(chosen.length===1?'':'s')+'. Choose up to four shortcuts.';
  }
  selectCount.value=String(state.count);
  // Watch uses the already initialized IPTV catalog; Read uses the
  // already initialized publisher RSS reader. Do not duplicate fetchers.
  const mediaContent=document.getElementById('nv-watch-channels');
  if(mediaContent){mediaContent.hidden=false;watch.append(mediaContent);}
  const newsContent=document.getElementById('nv-watch-headlines');
  if(newsContent){newsContent.hidden=false;readPanel.append(newsContent);}
  const oldSecondaryNav=document.getElementById('nv-watch-sections');
  oldSecondaryNav?.remove();
  document.getElementById('newview-quick-actions')?.remove();
  // Prevent the former media heading and redundant row of media tabs from
  // appearing in either Read or Watch.
  const mediaHub=document.querySelector('[data-workspace="media"]');
  mediaHub?.querySelector('.shell-eyebrow')?.setAttribute('hidden','');

  function addAction(area,label,description,onClick){
   const btn=el('button','nv-simple-tile');btn.type='button';
   const body=el('span','nv-simple-tile-text');
   body.append(el('strong','',label),el('small','',description));btn.append(body);
   btn.addEventListener('click',onClick);area.append(btn);
  }
  addAction(watchActions,'YouTube','Watch videos within NewView',()=>window.NewViewYouTube?.open?.());
  addAction(watchActions,'Mirror device','Phone and TV screen sharing',()=>{window.NewViewShell?.select?.('devices');window.NewViewCast?.open?.();});
  // Read focuses on text. Market charts and business sites are optional links,
  // never video controls or duplicate headline navigation.
  addAction(readActions,'Markets','Binance charts',()=>window.NewViewShell?.select?.('markets'));
  const readToolbar=el('div','nv-read-toolbar');
  const sourcePicker=document.getElementById('news-source'),headlineSearch=document.querySelector('#nv-watch-headlines input[aria-label="Filter news headlines"]');
  if(sourcePicker){const wrap=el('label','nv-read-source-label','Publisher');wrap.append(sourcePicker);readToolbar.append(wrap);}
  if(headlineSearch)readToolbar.append(headlineSearch);
  if(readToolbar.childNodes.length)readPanel.insertBefore(readToolbar,newsContent||readActions);
  // Bring all configuration behind one entry, instead of a second Settings
  // button and the inactive legacy customization sub-navigation.
  if(settings){customize.append(settings);settings.open=true;}
  const photo=document.getElementById('wallpaper-controls');
  if(photo){
   customize.insertBefore(photo,settings||now);
   const existing=document.getElementById('nv-wallpaper-credit');
   if(!existing){
    const credit=el('p','nv-wallpaper-credit');
    credit.id='nv-wallpaper-credit';
    credit.append('Default black tiger photograph: ');
    const attribution=el('a','','Government of Odisha / Wikimedia Commons (CC BY 4.0)');
    attribution.href='https://commons.wikimedia.org/wiki/File:Black_tiger_in_Similipal_Forest.jpg';
    attribution.target='_blank';attribution.rel='noopener noreferrer';
    credit.append(attribution,'. Upload your own JPEG, PNG or WebP to change it. Remove photo restores the default.');
    photo.after(credit);
   }
  }
  const legacyPersonal=home.querySelector('.newview-personalize');
  if(legacyPersonal){legacyPersonal.hidden=true;}
  const advanced=el('details','nv-custom-advanced');
  const advancedSummary=el('summary','','Advanced settings');
  const advancedContent=settings?.querySelector('.newview-settings-content');
  advanced.append(advancedSummary);
  if(advancedContent)advanced.append(advancedContent);
  if(settings)settings.hidden=true;
  customize.append(advanced);
  // Keep monitoring active but make its verbose journal opt-in and contained.
  const monitor=document.getElementById('newview-monitor-panel');
  if(monitor){
   const monitorDisclosure=el('details','nv-monitor-disclosure');
   const monitorSummary=el('summary','','Source health & activity');
   monitorDisclosure.append(monitorSummary,monitor);
   advanced.append(monitorDisclosure);
  }
  // The formerly visible settings and old widgets never become top-level
  // pages in this four-section experience.
  document.getElementById('newview-quick-actions')?.remove();
  function show(id){
   if(!sections.some(x=>x[0]===id))return;
   if(id!=='watch')window.NewViewYouTube?.close?.();
   active=id;
   placeChart(false);
   const view='myview';
   if(window.NewViewShell?.select?.(view)===false)return;
   content.hidden=id!=='home';watch.hidden=id!=='watch';readPanel.hidden=id!=='read';customize.hidden=id!=='customize';
   if(settings)settings.hidden=true;
   if(id==='read'&&!document.getElementById('news-items')?.children.length)document.getElementById('news-refresh')?.click();
   syncNav();
   if(id==='home'){placeChart(true);populateTopNews();syncFeatured();if(!window.NewViewNewsReader?.getItems?.().length){const source=document.getElementById('news-source');if(source)source.value='bbc';document.getElementById('news-refresh')?.click();}}
   // One document-level scroller: returning to the top of a new section avoids
   // inheriting the previous section's vertical position on phones.
   if(typeof window.scrollTo==='function')window.scrollTo({top:0,behavior:'instant'});
  }
  for(const [id,label] of sections){
   const button=el('button','nv-simple-tab',label);button.type='button';button.dataset.simpleView=id;
   button.addEventListener('click',()=>show(id));buttons.set(id,button);nav.append(button);
  }
  nav.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   const index=[...buttons.values()].indexOf(document.activeElement);if(index<0)return;
   const next=e.key==='Home'?0:e.key==='End'?3:(index+(e.key==='ArrowLeft'?-1:1)+4)%4;
   e.preventDefault();const b=[...buttons.values()][next];b.focus();b.click();
  });
  oldNav.after(nav);
  // Existing close buttons retain their keyboard and remote support.
  document.querySelectorAll('[data-close-panel],[data-close-closest-details]').forEach(button=>{
   button.addEventListener('click',()=>{
    const panel=button.dataset.closePanel?document.getElementById(button.dataset.closePanel):button.closest('details');
    if(!panel||!('open' in panel))return;panel.open=false;panel.querySelector(':scope > summary')?.focus();
   });
  });
  // No extra Devices / Screen cast header launchers: Watch → Mirroring is the entry.
  document.getElementById('newview-cast-trigger')?.remove();
  document.getElementById('nv-simple-device')?.remove();
  document.querySelectorAll('.newview-powerbi-hero,.newview-powerbi-grid,.social-intro,.social-links,.newview-quicklinks').forEach(n=>n.hidden=true);
  document.addEventListener('newview:workspace-change',event=>{
   const view=event.detail?.view;
   if(view!=='myview')placeChart(false);
   if(view==='markets'||view==='media'||view==='devices'){active=view==='media'?'watch':view==='markets'?'read':'watch';syncNav();}
  });
  window.NewViewSections=Object.freeze({show});
  render();show('home');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
