'use strict';
/* Shared NewView shell: five workspaces, with no fake financial/social data. */
(function(){
 const views=['myview','markets','business','media','social'];
 const names={myview:'MyView',markets:'NewViewMarkets',business:'NewViewBusiness',media:'Watch & News',social:'NewViewSocial'};
 const sourceNotes={
  myview:'MyView · preferences stored on this device',
  markets:'Binance public token prices in USDT · U.S. stock quotes unavailable without authorized feed',
  business:'Business · CSV processed locally and never uploaded',
  media:'Watch & News · publisher-linked headlines and official video embeds; source rights vary',
  social:'Social · saved public profile links only, no live feeds'
 };
 const FIRST_LAUNCH_KEY='newview.first-launch.v1';
 const FIRST_LAUNCH_DEFAULT=Object.freeze({interests:['markets','business','news'],coverage:'global',video:'manual',refresh:'balanced'});
 function sanitizeFirstLaunch(input){
  const allowed=new Set(['markets','business','news','technology','sports','entertainment','science','weather','social']);
  const interests=Array.isArray(input?.interests)?[...new Set(input.interests.filter(x=>allowed.has(x)))].slice(0,9):[...FIRST_LAUNCH_DEFAULT.interests];
  return {interests,coverage:['global','north-america','australia'].includes(input?.coverage)?input.coverage:'global',video:['manual','minimized','off'].includes(input?.video)?input.video:'manual',refresh:['balanced','frequent','data-saver'].includes(input?.refresh)?input.refresh:'balanced'};
 }
 function loadFirstLaunch(){try{const raw=localStorage.getItem(FIRST_LAUNCH_KEY);return raw?sanitizeFirstLaunch(JSON.parse(raw)):null;}catch{return null;}}
 function saveFirstLaunch(input){const safe=sanitizeFirstLaunch(input);try{localStorage.setItem(FIRST_LAUNCH_KEY,JSON.stringify(safe));}catch{}window.dispatchEvent(new CustomEvent('newview:preferences-change',{detail:safe}));return safe;}
 function installFirstLaunch(){
  if(window.NewViewApps||loadFirstLaunch())return;
  const container=document.createElement('section');container.className='shell-card';container.id='newview-first-launch';
  container.setAttribute('aria-label','First launch personalization');
  const title=document.createElement('h2');title.textContent='Welcome to NewView';
  const description=document.createElement('p');description.textContent='Choose interests once to personalize all dashboards. No account required.';
  const topics=['markets','business','news','technology','sports','entertainment','science','weather','social'];
  const field=document.createElement('div');field.className='myview-editor';
  for(const topic of topics){const label=document.createElement('label');label.className='myview-option';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=topic;checkbox.checked=FIRST_LAUNCH_DEFAULT.interests.includes(topic);label.append(checkbox,document.createTextNode(' '+topic.charAt(0).toUpperCase()+topic.slice(1)));field.append(label);}
  function selector(labelText,values){const label=document.createElement('label');label.textContent=labelText+' ';const select=document.createElement('select');for(const [value,name] of values){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);}label.append(select);container.append(label);return select;}
  container.append(title,description,field);
  const coverage=selector('Coverage',[['global','Global'],['north-america','United States & Canada'],['australia','Australia']]);
  const video=selector('Video',[['manual','Floating video on request'],['minimized','Start minimized'],['off','Video off']]);
  const refresh=selector('Refresh',[['balanced','Balanced'],['frequent','Frequent'],['data-saver','Data saver']]);
  const actions=document.createElement('div');actions.className='myview-toolbar';
  const skip=document.createElement('button');skip.type='button';skip.textContent='Use recommended defaults';
  const save=document.createElement('button');save.type='button';save.textContent='Save preferences';
  function finish(custom){
   saveFirstLaunch(custom?{interests:[...field.querySelectorAll('input:checked')].map(x=>x.value),coverage:coverage.value,video:video.value,refresh:refresh.value}:FIRST_LAUNCH_DEFAULT);
   // Restore focus when the first-launch controls are removed, including on TV remotes.
   const hadFocus=container.contains(document.activeElement);
   container.remove();
   if(hadFocus){
    const visible=el=>!!(el&&!el.hidden&&!el.closest('[hidden],[inert],[aria-hidden="true"]')&&el.getClientRects().length);
    const selected=document.querySelector('[data-view-button][aria-pressed="true"]');
    const current=document.body.dataset.currentWorkspace||'myview';
    const page=document.querySelector('[data-workspace="'+current+'"]');
    const destination=visible(selected)?selected:visible(page)?page:null;
    if(destination){
     if(destination===page&&!page.hasAttribute('tabindex'))page.tabIndex=-1;
     destination.focus({preventScroll:true});
    }
   }
  }
  skip.addEventListener('click',()=>finish(false));save.addEventListener('click',()=>finish(true));
  actions.append(skip,save);container.append(actions);
  const target=document.getElementById('workspace-intro');target?.parentNode?.insertBefore(container,target);
 }
 const DISPLAY_KEY='newview.display.profiles.v1';
 const DISPLAY_DEFAULT={name:'Default TV',views:['myview','markets','business','media','social'],refreshSeconds:60,fullscreen:false};
 function sanitizeDisplay(value){
  if(!value||typeof value!=='object')return {...DISPLAY_DEFAULT,views:[...DISPLAY_DEFAULT.views]};
  const list=Array.isArray(value.views)?value.views:DISPLAY_DEFAULT.views;
  const selected=[...new Set(list.map(v=>v==='news'?'media':v).filter(v=>views.includes(v)))];
  const seconds=Number(value.refreshSeconds);
  return {name:typeof value.name==='string'?value.name.slice(0,40):DISPLAY_DEFAULT.name,views:selected.length?selected:[...DISPLAY_DEFAULT.views],refreshSeconds:[0,30,60,120,300].includes(seconds)?seconds:60,fullscreen:value.fullscreen===true};
 }
 function loadDisplays(){try{const x=JSON.parse(localStorage.getItem(DISPLAY_KEY)||'[]');return Array.isArray(x)?x.slice(0,5).map(sanitizeDisplay):[];}catch{return [];}}
 function saveDisplays(profiles){const safe=profiles.slice(0,5).map(sanitizeDisplay);try{localStorage.setItem(DISPLAY_KEY,JSON.stringify(safe));}catch{}return safe;}
 const getStored=()=>{try{const v=localStorage.getItem('newview.workspace');return v==='news'?'media':views.includes(v)?v:'myview';}catch{return 'myview';}};
 function select(view){
  if(!views.includes(view)||document.body.classList.contains('home-panel'))return false;
  const market=document.getElementById('market-shell');
  const chart=document.querySelector('.workspace');
  const board=document.getElementById('stock-board');
  const chartToggle=document.getElementById('board-toggle');
  if(chartToggle)chartToggle.hidden=view!=='markets';
  if(view!=='media'&&window.NewViewMedia?.stopPlayback)window.NewViewMedia.stopPlayback();
  // When switching views from a shortcut or TV remote, never strand keyboard focus
  // inside a panel that becomes hidden. Preserve focus for ordinary tab clicks.
  const previouslyFocused=document.activeElement;
  const focusedWorkspace=previouslyFocused?.closest?.('[data-workspace]:not([hidden])');
  const focusedMarketPanel=previouslyFocused?.closest?.('#market-shell, #stock-board, .workspace');
  const marketPanelWillHide=view!=='markets'&&!(view==='myview'&&document.body.classList.contains('tv-launcher'));
  const focusWasInHiddenPanel=!!(focusedWorkspace&&focusedWorkspace.dataset.workspace!==view) ||
   !!(focusedMarketPanel&&marketPanelWillHide) ||
   !!(chartToggle&&previouslyFocused===chartToggle&&view!=='markets');
  document.querySelectorAll('[data-workspace]').forEach(el=>{el.hidden=el.dataset.workspace!==view;});
  // Restore focus only after the destination workspace has become visible.
  // TV launcher mode can hide the tab strip entirely; use the visible page instead.
  for(const el of document.querySelectorAll('[data-view-button]')){
   const active=el.dataset.viewButton===view;el.setAttribute('aria-pressed',String(active));el.classList.toggle('selected',active);
   // A single tab stop keeps TV remotes and keyboard users from traversing every workspace tab.
   // Arrow/Home/End keys still provide direct access to all available workspaces.
   el.tabIndex=active?0:-1;
  }
  const workspaceTitle=document.getElementById('workspace-title');
  if(workspaceTitle){
   workspaceTitle.setAttribute('role','status');
   workspaceTitle.setAttribute('aria-live','polite');
   workspaceTitle.setAttribute('aria-atomic','true');
   workspaceTitle.textContent=names[view];
  }
  const source=document.getElementById('footer-source');
  if(source)source.textContent=sourceNotes[view];
  document.body.dataset.currentWorkspace=view;
  document.dispatchEvent(new CustomEvent('newview:workspace-change',{detail:{view}}));
  const activeTab=document.querySelector('[data-view-button="'+view+'"]');
  if(activeTab)activeTab.setAttribute('aria-current','page');
  if(focusWasInHiddenPanel&&activeTab){try{activeTab.focus({preventScroll:true});}catch{activeTab.focus();}}
  document.querySelectorAll('[data-view-button]').forEach(tab=>{if(tab!==activeTab)tab.removeAttribute('aria-current');});
  if(view==='markets'){
    if(market)market.hidden=false;
    const isBoard=document.body.classList.contains('board-active');
    if(board)board.hidden=!isBoard;if(chart)chart.hidden=isBoard;
    if(!isBoard)requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }else if(view==='myview'&&document.body.classList.contains('tv-launcher')){if(market)market.hidden=false;if(board)board.hidden=true;if(chart)chart.hidden=false;requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));}
  else{if(market)market.hidden=true;if(board)board.hidden=true;if(chart)chart.hidden=true;}
  if(focusWasInHiddenPanel){
   const destination=document.querySelector('[data-view-button="'+view+'"]');
   const visible=el=>el&&!el.hidden&&!el.closest('[hidden],[inert],[aria-hidden="true"]')&&el.getClientRects().length>0;
   if(visible(destination))destination.focus({preventScroll:true});
   else{
    const page=document.querySelector('[data-workspace="'+view+'"]');
    if(visible(page)){
     if(!page.hasAttribute('tabindex'))page.tabIndex=-1;
     page.focus({preventScroll:true});
    }
   }
  }
  try{localStorage.setItem('newview.workspace',view);}catch{}
  const page=document.querySelector('[data-workspace="'+view+'"]');
  if(page&&page.scrollTo)page.scrollTo({top:0,behavior:'auto'});
  return true;
 }
 function installDisplay(){
  const picker=document.getElementById('display-profile'),refresh=document.getElementById('display-refresh'),status=document.getElementById('display-status');
  if(!picker||!refresh||!status)return;
  // Display-profile feedback must be announced without interrupting TV navigation.
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.setAttribute('aria-atomic','true');
  let profiles=loadDisplays();let active=sanitizeDisplay(profiles[0]);let timer=null;
  function report(message){status.textContent=message;}
  function apply(profile){active=sanitizeDisplay(profile);refresh.value=String(active.refreshSeconds);document.body.classList.toggle('display-mode',active.fullscreen);schedule();report('Profile: '+active.name+' · stored on this device only');}
  function renderProfiles(){picker.replaceChildren();const options=profiles.length?profiles:[active];options.forEach((p,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=p.name||'Display '+(i+1);picker.append(o);});}
  function refreshVisible(){const view=document.body.dataset.currentWorkspace;if(view==='media'&&window.NewViewWatch?.currentSection?.()==='headlines')document.getElementById('news-refresh')?.click();else if(view==='markets')document.getElementById('refresh')?.click();}
  function schedule(){if(timer)clearInterval(timer);timer=null;if(active.refreshSeconds)timer=setInterval(()=>{if(!document.hidden)refreshVisible();},active.refreshSeconds*1000);}
  picker.addEventListener('change',()=>apply(profiles[Number(picker.value)]||active));
  refresh.addEventListener('change',()=>{active=sanitizeDisplay({...active,refreshSeconds:Number(refresh.value)});schedule();report('Refresh interval changed; save profile to retain it');});
  document.getElementById('display-save')?.addEventListener('click',()=>{
   const chosen=prompt('Display profile name (saved only on this TV/browser)',active.name);
   if(typeof chosen!=='string')return;const name=chosen.trim().slice(0,40);if(!name){report('Enter a profile name');return;}
   const updated=sanitizeDisplay({...active,name});const index=profiles.findIndex(p=>p.name===name);
   if(index>=0)profiles[index]=updated;else if(profiles.length<5)profiles.push(updated);else{report('Maximum five profiles. Reuse an existing name.');return;}
   profiles=saveDisplays(profiles);renderProfiles();picker.value=String(profiles.findIndex(p=>p.name===name));apply(updated);
  });
  document.getElementById('display-fullscreen')?.addEventListener('click',()=>{
   active=sanitizeDisplay({...active,fullscreen:!active.fullscreen});document.body.classList.toggle('display-mode',active.fullscreen);
   if(active.fullscreen&&document.documentElement.requestFullscreen){try{Promise.resolve(document.documentElement.requestFullscreen()).catch(()=>report('Fullscreen not supported; display mode is active'));}catch{report('Fullscreen not supported; display mode is active');}}
   if(!active.fullscreen&&document.fullscreenElement&&document.exitFullscreen){try{Promise.resolve(document.exitFullscreen()).catch(()=>{});}catch{}}
   report('Display mode '+(active.fullscreen?'on':'off')+'; save profile to retain it');
  });
  document.getElementById('display-next')?.addEventListener('click',()=>{
   const current=document.body.dataset.currentWorkspace;const i=active.views.indexOf(current);select(active.views[(i+1)%active.views.length]);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('display-mode')){document.body.classList.remove('display-mode');active=sanitizeDisplay({...active,fullscreen:false});}});
  renderProfiles();apply(active);
 }

 // Fast workspace navigator: local commands only, with no external search or data collection.
 function installCommandPalette(){
  const header=document.querySelector('main > header');
  if(!header||document.getElementById('newview-command-open'))return;
  const trigger=document.createElement('button');
  trigger.type='button';trigger.id='newview-command-open';trigger.className='newview-command-trigger';
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-keyshortcuts','Control+k Meta+k');
  trigger.textContent='⌕ Find workspace';header.append(trigger);
  const overlay=document.createElement('div');overlay.id='newview-command-overlay';overlay.className='newview-command-overlay';overlay.hidden=true;
  const dialog=document.createElement('section');dialog.className='newview-command-dialog';dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','newview-command-label');
  const label=document.createElement('label');label.id='newview-command-label';label.htmlFor='newview-command-input';label.textContent='Jump to a workspace';
  const input=document.createElement('input');input.id='newview-command-input';input.type='search';
  input.placeholder='Search Markets, News, Watch, Business…';input.autocomplete='off';
  const hint=document.createElement('p');hint.className='newview-command-hint';hint.textContent='↑ ↓ select · Enter open · Esc close';
  const results=document.createElement('div');results.id='newview-command-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','Workspace results');
  const close=document.createElement('button');close.type='button';close.className='newview-command-close';close.textContent='Close';close.setAttribute('aria-label','Close workspace search');
  const top=document.createElement('div');top.className='newview-command-top';top.append(label,close);
  dialog.append(top,input,results,hint);overlay.append(dialog);document.body.append(overlay);
  const actions=[
   {name:'MyView',detail:'Personal dashboard and widgets',view:'myview'},
   {name:'Markets',detail:'Charts and watchlists',view:'markets'},
   {name:'Business',detail:'Local CSV analytics',view:'business'},
   {name:'Headlines',detail:'Publisher-linked news',view:'media',section:'headlines'},
   {name:'Live TV',detail:'Public channel directory',view:'media',section:'channels'},
   {name:'Videos',detail:'Official video embeds',view:'media',section:'videos'},
   {name:'Social',detail:'Public profile bookmarks',view:'social'}
  ];
  let visible=actions,selected=0,restoreFocus=trigger;
  function closePalette(){
   if(overlay.hidden)return false;
   overlay.hidden=true;input.value='';
   if(restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});
   return true;
  }
  function openPalette(){
   if(document.body.classList.contains('home-panel'))return;
   restoreFocus=document.activeElement instanceof HTMLElement?document.activeElement:trigger;
   overlay.hidden=false;selected=0;input.value='';render();input.focus();
  }
  function choose(action){
   if(!action)return;closePalette();select(action.view);
   if(action.section)window.NewViewWatch?.select?.(action.section);
  }
  function render(){
   const q=input.value.trim().toLocaleLowerCase();
   visible=actions.filter(a=>(a.name+' '+a.detail).toLocaleLowerCase().includes(q));
   selected=Math.min(selected,Math.max(visible.length-1,0));results.replaceChildren();
   visible.forEach((action,i)=>{
    const item=document.createElement('button');item.type='button';item.className='newview-command-result';item.setAttribute('role','option');
    item.setAttribute('aria-selected',String(i===selected));item.tabIndex=-1;
    const name=document.createElement('strong');name.textContent=action.name;
    const description=document.createElement('small');description.textContent=action.detail;
    item.append(name,description);item.addEventListener('click',()=>choose(action));results.append(item);
   });
   if(!visible.length){const empty=document.createElement('p');empty.className='newview-command-empty';empty.textContent='No matching workspace';results.append(empty);}
   input.setAttribute('aria-activedescendant','');
   [...results.querySelectorAll('[role="option"]')].forEach((el,i)=>{el.id='newview-command-item-'+i;if(i===selected)input.setAttribute('aria-activedescendant',el.id);});
  }
  trigger.addEventListener('click',openPalette);close.addEventListener('click',closePalette);
  input.addEventListener('input',()=>{selected=0;render();});
  overlay.addEventListener('click',e=>{if(e.target===overlay)closePalette();});
  overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'||e.key==='BrowserBack'){e.preventDefault();e.stopPropagation();closePalette();return;}
   if(e.key==='Tab'){
    const target=e.shiftKey?close:input;
    if((e.shiftKey&&document.activeElement===input)||(!e.shiftKey&&document.activeElement===close)){e.preventDefault();target.focus();}
   }
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();if(visible.length){selected=(selected+(e.key==='ArrowDown'?1:-1)+visible.length)%visible.length;render();}
   }
   if(e.key==='Enter'&&document.activeElement===input){e.preventDefault();choose(visible[selected]);}
  });
  document.addEventListener('keydown',e=>{
   if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();overlay.hidden?openPalette():closePalette();}
  });
  window.NewViewCloseCommandPalette=closePalette;
 }
 function install(){
  if(document.body.classList.contains('home-panel'))return;
  const nav=document.getElementById('workspace-switcher');if(!nav)return;
  nav.addEventListener('click',event=>{const b=event.target instanceof Element?event.target.closest('[data-view-button]'):null;if(b)select(b.dataset.viewButton);});
  // Keep the mobile/tablet selector synchronized with the actual pinned widgets.
  const panelTabs=document.querySelector('.newview-panel-tabs');
  const panelGrid=document.getElementById('myview-grid');
  let activePanel='market';
  function syncPanels(){
    if(!panelGrid||!panelTabs)return;
    const widgets=[...panelGrid.querySelectorAll('.myview-widget')];
    const selected=widgets.find(el=>el.dataset.widget===activePanel)||widgets[0];
    if(selected)activePanel=selected.dataset.widget;
    widgets.forEach(el=>{el.dataset.panelActive=String(el===selected);});
    panelTabs.querySelectorAll('[data-panel-choice]').forEach(b=>{
      const exists=widgets.some(el=>el.dataset.widget===b.dataset.panelChoice);
      b.hidden=!exists;
      b.disabled=!exists;
      b.setAttribute('aria-pressed',String(b.dataset.panelChoice===activePanel&&exists));
    });
    panelTabs.hidden=!widgets.length;
  }
  panelTabs?.addEventListener('click',e=>{const b=e.target.closest('[data-panel-choice]');if(!b||b.disabled)return;activePanel=b.dataset.panelChoice;syncPanels();});
  panelTabs?.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const buttons=[...panelTabs.querySelectorAll('[data-panel-choice]:not([hidden]):not(:disabled)')];
    const at=buttons.indexOf(document.activeElement);if(at<0||!buttons.length)return;
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(at+(e.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;
    buttons[next].focus();buttons[next].click();
  });
  if(panelGrid){new MutationObserver(syncPanels).observe(panelGrid,{childList:true});syncPanels();}

  document.querySelector('[data-workspace="myview"]')?.addEventListener('click',event=>{const b=event.target.closest('[data-home-view]');if(!b)return;const view=b.dataset.homeView;if(!views.includes(view))return;select(view);if(b.dataset.homeSection)window.NewViewWatch?.select(b.dataset.homeSection);});
  // Settings drawer: Escape/TV Back closes it, and focus returns to its opener.
  const settingsDrawer=document.getElementById('newview-settings');
  if(settingsDrawer){
    const trigger=settingsDrawer.querySelector('summary');
    settingsDrawer.addEventListener('keydown',event=>{
      if((event.key==='Escape'||event.key==='Backspace')&&settingsDrawer.open){
        if(event.target.matches?.('input,textarea,[contenteditable="true"]')&&event.key==='Backspace')return;
        event.preventDefault();event.stopPropagation();settingsDrawer.open=false;trigger?.focus();
      }
    });
    document.addEventListener('keydown',event=>{
      if(!settingsDrawer.open||!['Escape','BrowserBack'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();settingsDrawer.open=false;trigger?.focus();
    });
  }
  // Roving focus for keyboard and Android TV remotes; native Tab remains available.
  nav.addEventListener('keydown',event=>{
   if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
   const target=event.target.closest?.('[data-view-button]');
   if(!target||!nav.contains(target))return;
   const buttons=[...nav.querySelectorAll('[data-view-button]')].filter(tab=>!tab.disabled&&!tab.hidden&&!tab.closest('[hidden],[inert],[aria-hidden="true"]')&&tab.getAttribute('aria-disabled')!=='true'&&tab.getClientRects().length>0);
   const index=buttons.indexOf(target);
   if(index<0||!buttons.length)return;
   const rtl=getComputedStyle(nav).direction==='rtl';
   const delta=(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)*(rtl&&(event.key==='ArrowLeft'||event.key==='ArrowRight')?-1:1);
   const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+delta+buttons.length)%buttons.length;
   event.preventDefault();
   buttons[next].focus();
   select(buttons[next].dataset.viewButton);
  });
  document.querySelectorAll('[data-open-markets]').forEach(b=>b.addEventListener('click',()=>select('markets')));
  const boardButton=document.getElementById('board-toggle');
  const marketActions=document.getElementById('shell-market-actions');
  if(boardButton&&marketActions)marketActions.appendChild(boardButton);
  select(window.NewViewApps?'myview':getStored());
  installCommandPalette();
  installDisplay();
  installFirstLaunch();
 }
 // Native Android Back uses the same ordered dismissal as keyboard navigation.
 window.NewViewBack=()=>{
  if(window.NewViewCloseCommandPalette?.())return true;
  const drawer=document.getElementById('newview-settings');
  if(drawer?.open){drawer.open=false;drawer.querySelector('summary')?.focus();return true;}
  if(window.NewViewHomeBack?.())return true;
  if(document.body.classList.contains('display-mode')){
   document.body.classList.remove('display-mode');
   if(document.fullscreenElement&&document.exitFullscreen)Promise.resolve(document.exitFullscreen()).catch(()=>{});
   return true;
  }
  if(document.body.dataset.currentWorkspace!=='myview'){
   select('myview');document.querySelector('[data-view-button="myview"]')?.focus();return true;
  }
  return false;
 };
 document.addEventListener('keydown',event=>{
  if(!event.defaultPrevented&&['Escape','BrowserBack'].includes(event.key)&&window.NewViewBack())event.preventDefault();
 });
 window.NewViewShell={views,names,select,getStored,sanitizeDisplay,loadDisplays,saveDisplays,sanitizeFirstLaunch,loadFirstLaunch,saveFirstLaunch};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
