'use strict';
/* Shared NewView shell: six workspaces, with no fake financial/social data. */
(function(){
 const views=['myview','markets','business','news','media','social'];
 const names={myview:'MyView',markets:'NewViewMarkets',business:'NewViewBusiness',news:'NewViewNews',media:'NewViewMedia',social:'NewViewSocial'};
 const sourceNotes={
  myview:'MyView · preferences stored on this device',
  markets:'Binance public token prices in USDT · U.S. stock quotes unavailable without authorized feed',
  business:'Business · CSV processed locally and never uploaded',
  news:'News · official RSS announcements, source-linked',
  media:'Media · official YouTube embeds may contain ads · PipeTv external on Android TV',
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
  function finish(custom){saveFirstLaunch(custom?{interests:[...field.querySelectorAll('input:checked')].map(x=>x.value),coverage:coverage.value,video:video.value,refresh:refresh.value}:FIRST_LAUNCH_DEFAULT);container.remove();}
  skip.addEventListener('click',()=>finish(false));save.addEventListener('click',()=>finish(true));
  actions.append(skip,save);container.append(actions);
  const target=document.getElementById('workspace-intro');target?.parentNode?.insertBefore(container,target);
 }
 const DISPLAY_KEY='newview.display.profiles.v1';
 const DISPLAY_DEFAULT={name:'Default TV',views:['myview','markets','business','news','media','social'],refreshSeconds:60,fullscreen:false};
 function sanitizeDisplay(value){
  if(!value||typeof value!=='object')return {...DISPLAY_DEFAULT,views:[...DISPLAY_DEFAULT.views]};
  const list=Array.isArray(value.views)?value.views:DISPLAY_DEFAULT.views;
  const selected=[...new Set(list.filter(v=>views.includes(v)))];
  const seconds=Number(value.refreshSeconds);
  return {name:typeof value.name==='string'?value.name.slice(0,40):DISPLAY_DEFAULT.name,views:selected.length?selected:[...DISPLAY_DEFAULT.views],refreshSeconds:[0,30,60,120,300].includes(seconds)?seconds:60,fullscreen:value.fullscreen===true};
 }
 function loadDisplays(){try{const x=JSON.parse(localStorage.getItem(DISPLAY_KEY)||'[]');return Array.isArray(x)?x.slice(0,5).map(sanitizeDisplay):[];}catch{return [];}}
 function saveDisplays(profiles){const safe=profiles.slice(0,5).map(sanitizeDisplay);try{localStorage.setItem(DISPLAY_KEY,JSON.stringify(safe));}catch{}return safe;}
 const getStored=()=>{try{const v=localStorage.getItem('newview.workspace');return views.includes(v)?v:'myview';}catch{return 'myview';}};
 function select(view){
  if(!views.includes(view)||document.body.classList.contains('home-panel'))return false;
  const market=document.getElementById('market-shell');
  const chart=document.querySelector('.workspace');
  const board=document.getElementById('stock-board');
  const chartToggle=document.getElementById('board-toggle');
  if(chartToggle)chartToggle.hidden=view!=='markets';
  if(view!=='media'&&window.NewViewMedia?.stopPlayback)window.NewViewMedia.stopPlayback();
  document.querySelectorAll('[data-workspace]').forEach(el=>{el.hidden=el.dataset.workspace!==view;});
  for(const el of document.querySelectorAll('[data-view-button]')){
   const active=el.dataset.viewButton===view;el.setAttribute('aria-pressed',String(active));el.classList.toggle('selected',active);
  }
  document.getElementById('workspace-title').textContent=names[view];
  const source=document.getElementById('footer-source');
  if(source)source.textContent=sourceNotes[view];
  document.body.dataset.currentWorkspace=view;
  document.dispatchEvent(new CustomEvent('newview:workspace-change',{detail:{view}}));
  const activeTab=document.querySelector('[data-view-button="'+view+'"]');
  if(activeTab)activeTab.setAttribute('aria-current','page');
  document.querySelectorAll('[data-view-button]').forEach(tab=>{if(tab!==activeTab)tab.removeAttribute('aria-current');});
  if(view==='markets'){
    market.hidden=false;
    const isBoard=document.body.classList.contains('board-active');
    board.hidden=!isBoard;chart.hidden=isBoard;
    if(!isBoard)requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }else if(view==='myview'&&document.body.classList.contains('tv-launcher')){market.hidden=false;board.hidden=true;chart.hidden=false;requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));}
  else{market.hidden=true;board.hidden=true;chart.hidden=true;}
  try{localStorage.setItem('newview.workspace',view);}catch{}
  const page=document.querySelector('[data-workspace="'+view+'"]');
  if(page&&page.scrollTo)page.scrollTo({top:0,behavior:'instant'});
  return true;
 }
 function installDisplay(){
  const picker=document.getElementById('display-profile'),refresh=document.getElementById('display-refresh'),status=document.getElementById('display-status');
  if(!picker||!refresh||!status)return;
  let profiles=loadDisplays();let active=sanitizeDisplay(profiles[0]);let timer=null;
  function report(message){status.textContent=message;}
  function apply(profile){active=sanitizeDisplay(profile);refresh.value=String(active.refreshSeconds);document.body.classList.toggle('display-mode',active.fullscreen);schedule();report('Profile: '+active.name+' · stored on this device only');}
  function renderProfiles(){picker.replaceChildren();const options=profiles.length?profiles:[active];options.forEach((p,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=p.name||'Display '+(i+1);picker.append(o);});}
  function refreshVisible(){const view=document.body.dataset.currentWorkspace;if(view==='news')document.getElementById('news-refresh')?.click();else if(view==='markets')document.getElementById('refresh')?.click();}
  function schedule(){if(timer)clearInterval(timer);timer=null;if(active.refreshSeconds)timer=setInterval(()=>{if(!document.hidden)refreshVisible();},active.refreshSeconds*1000);}
  picker.addEventListener('change',()=>apply(profiles[Number(picker.value)]||active));
  refresh.addEventListener('change',()=>{active=sanitizeDisplay({...active,refreshSeconds:Number(refresh.value)});schedule();report('Refresh interval changed; save profile to retain it');});
  document.getElementById('display-save')?.addEventListener('click',()=>{
   const chosen=prompt('Display profile name (saved only on this TV/browser)',active.name);
   if(chosen===null)return;const name=chosen.trim().slice(0,40);if(!name){report('Enter a profile name');return;}
   const updated=sanitizeDisplay({...active,name});const index=profiles.findIndex(p=>p.name===name);
   if(index>=0)profiles[index]=updated;else if(profiles.length<5)profiles.push(updated);else{report('Maximum five profiles. Reuse an existing name.');return;}
   profiles=saveDisplays(profiles);renderProfiles();picker.value=String(profiles.findIndex(p=>p.name===name));apply(updated);
  });
  document.getElementById('display-fullscreen')?.addEventListener('click',()=>{
   active=sanitizeDisplay({...active,fullscreen:!active.fullscreen});document.body.classList.toggle('display-mode',active.fullscreen);
   if(active.fullscreen&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>report('Fullscreen not supported; display mode is active'));
   if(!active.fullscreen&&document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});
   report('Display mode '+(active.fullscreen?'on':'off')+'; save profile to retain it');
  });
  document.getElementById('display-next')?.addEventListener('click',()=>{
   const current=document.body.dataset.currentWorkspace;const i=active.views.indexOf(current);select(active.views[(i+1)%active.views.length]);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('display-mode')){document.body.classList.remove('display-mode');active=sanitizeDisplay({...active,fullscreen:false});}});
  renderProfiles();apply(active);
 }
 function install(){
  if(document.body.classList.contains('home-panel'))return;
  const nav=document.getElementById('workspace-switcher');if(!nav)return;
  nav.addEventListener('click',event=>{const b=event.target.closest('[data-view-button]');if(b)select(b.dataset.viewButton);});
  document.querySelectorAll('[data-open-markets]').forEach(b=>b.addEventListener('click',()=>select('markets')));
  const boardButton=document.getElementById('board-toggle');
  if(boardButton)document.getElementById('shell-market-actions').appendChild(boardButton);
  select(window.NewViewApps?'myview':getStored());
  installDisplay();
  installFirstLaunch();
 }
 window.NewViewShell={views,names,select,getStored,sanitizeDisplay,loadDisplays,saveDisplays,sanitizeFirstLaunch,loadFirstLaunch,saveFirstLaunch};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
