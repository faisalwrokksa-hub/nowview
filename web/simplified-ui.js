'use strict';
/* One accessible four-destination shell. Controllers remain in their original
 * modules; Home remembers 1–4 user-selected destinations on this device. */
(function(){
 const KEY='newview.home.boxes.v2',COUNT_KEY='newview.home.box-count.v2';
 const choices=[
  {id:'markets',label:'Markets',sub:'Binance charts and watchlists',section:'read'},
  {id:'iptv',label:'IPTV',sub:'Live public TV directory',section:'watch'},
  {id:'youtube',label:'YouTube',sub:'Open official YouTube',section:'watch'},
  {id:'news',label:'News',sub:'Worldwide publisher headlines',section:'read'},
  {id:'devices',label:'Mirroring',sub:'Phone and TV casting',section:'watch'},
  {id:'business',label:'Business',sub:'Open authorized reports',section:'read'}
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
  const sections=[['home','Home'],['watch','Watch'],['read','Read'],['customize','Customize']];
  const buttons=new Map();let active='home',state=read();
  const content=el('section','nv-simple-home');content.id='nv-simple-home';content.setAttribute('aria-label','Personalized Home');
  const banner=el('div','nv-simple-welcome');
  banner.append(el('h2','','My dashboard'),el('p','','Your selected sources and shortcuts'));
  const grid=el('div','nv-simple-grid');
  grid.id='nv-simple-grid';
  content.append(banner,grid);home.prepend(content);
  const watch=el('section','nv-hub-panel');watch.id='nv-watch-hub';watch.hidden=true;
  watch.append(el('h2','','Watch'),el('p','','Choose what to watch or mirror'));
  const watchActions=el('div','nv-hub-grid');watch.append(watchActions);home.append(watch);
  const readPanel=el('section','nv-hub-panel');readPanel.id='nv-read-hub';readPanel.hidden=true;
  readPanel.append(el('h2','','Read'),el('p','','News, business websites and market charts'));
  const readActions=el('div','nv-hub-grid');readPanel.append(readActions);home.append(readPanel);
  const customize=el('section','nv-hub-panel');customize.id='nv-customize-hub';customize.hidden=true;
  const customHeading=el('h2','','Customize Home');
  const desc=el('p','','Choose 1–4 boxes. Your choices stay on this device.');
  const selectCount=el('select','nv-custom-count');selectCount.id='nv-custom-count';selectCount.setAttribute('aria-label','Number of Home boxes');
  for(let n=1;n<=4;n++){const option=el('option','',n+' box'+(n===1?'':'es'));option.value=String(n);selectCount.append(option);}
  const optionGrid=el('div','nv-custom-options');
  customize.append(customHeading,desc,selectCount,optionGrid);home.append(customize);
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
   if(target==='business'){window.open('https://app.powerbi.com/','_blank','noopener,noreferrer');return;}
   if(target==='youtube'){
    show('watch');window.NewViewYouTube?.open?.();return;
   }
  }
  function actionTile(item){
   const b=el('button','nv-simple-tile');b.type='button';b.dataset.simpleTarget=item.id;
   const icon=el('span','nv-simple-tile-icon',({markets:'▤',iptv:'▣',youtube:'▶',news:'▥',devices:'▧',business:'▦'})[item.id]);icon.setAttribute('aria-hidden','true');
   const label=el('span','nv-simple-tile-text');label.append(el('strong','',item.label),el('small','',item.sub));
   b.append(icon,label);b.addEventListener('click',()=>navigate(item.id));return b;
  }
  function render(){
   grid.replaceChildren();const chosen=state.items.slice(0,state.count);
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
   now.textContent=chosen.length+' Home box'+(chosen.length===1?'':'es')+' selected';
  }
  selectCount.addEventListener('change',()=>{state.count=Math.max(1,Math.min(4,Number(selectCount.value)||4));store(state);render();});
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

  const launch=(url)=>{if(typeof window.NewViewNative?.openNewsBrowser==='function')window.NewViewNative.openNewsBrowser(url);else window.open(url,'_blank','noopener,noreferrer');};
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
  addAction(readActions,'Business','Power BI reports',()=>launch('https://app.powerbi.com/'));
  const readToolbar=el('div','nv-read-toolbar');
  const sourcePicker=document.getElementById('news-source'),headlineSearch=document.querySelector('#nv-watch-headlines input[aria-label="Filter news headlines"]');
  const note=el('p','nv-read-subtitle','Choose a publisher and read its latest headlines.');
  readPanel.insertBefore(note,readActions);
  if(sourcePicker){const wrap=el('label','nv-read-source-label','Publisher');wrap.append(sourcePicker);readToolbar.append(wrap);}
  if(headlineSearch)readToolbar.append(headlineSearch);
  if(readToolbar.childNodes.length)readPanel.insertBefore(readToolbar,newsContent||readActions);
  // Bring all configuration behind one entry, instead of a second Settings
  // button and the inactive legacy customization sub-navigation.
  if(settings){customize.append(settings);settings.open=true;}
  const photo=document.getElementById('wallpaper-controls');
  if(photo)customize.insertBefore(photo,settings||now);
  const legacyPersonal=home.querySelector('.newview-personalize');
  if(legacyPersonal){legacyPersonal.hidden=true;}
  const advanced=el('details','nv-custom-advanced');
  const advancedSummary=el('summary','','Advanced settings');
  const advancedContent=settings?.querySelector('.newview-settings-content');
  advanced.append(advancedSummary);
  if(advancedContent)advanced.append(advancedContent);
  if(settings)settings.hidden=true;
  customize.append(advanced);
  // The formerly visible settings and old widgets never become top-level
  // pages in this four-section experience.
  document.getElementById('newview-quick-actions')?.remove();
  function show(id){
   if(!sections.some(x=>x[0]===id))return;
   if(id!=='watch')window.NewViewYouTube?.close?.();
   active=id;
   const view='myview';
   if(window.NewViewShell?.select?.(view)===false)return;
   content.hidden=id!=='home';watch.hidden=id!=='watch';readPanel.hidden=id!=='read';customize.hidden=id!=='customize';
   if(settings)settings.hidden=true;
   if(id==='read'&&!document.getElementById('news-items')?.children.length)document.getElementById('news-refresh')?.click();
   syncNav();
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
   if(view==='markets'||view==='media'||view==='devices'){active=view==='media'?'watch':view==='markets'?'read':'watch';syncNav();}
  });
  render();show('home');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
