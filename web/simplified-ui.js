'use strict';
/* NewView simplified presentation. Preserves the existing feature controllers,
   while limiting what is visible at once to Home, Markets, Watch, and News. */
(function(){
 function install(){
  const main=document.querySelector('body > main'),oldNav=document.getElementById('workspace-switcher'),
   home=document.querySelector('[data-workspace="myview"]'),header=main?.querySelector(':scope > header');
  if(!main||!oldNav||!home||!header||document.getElementById('nv-simple-nav'))return;
  document.body.classList.add('nv-simple');
  const el=(tag,cls,content)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(content!==undefined)node.textContent=content;return node;};
  const nav=el('nav','nv-simple-nav');nav.id='nv-simple-nav';nav.setAttribute('aria-label','Main dashboard navigation');
  const sections=[
   ['home','Home','myview',null],
   ['markets','Markets','markets',null],
   ['watch','Watch','media','channels'],
   ['news','News','media','headlines']
  ];
  let active='home';
  const buttons=new Map();
  function show(id){
   const item=sections.find(([key])=>key===id);
   if(!item)return;
   const [,label,view,sub]=item;
   if(!window.NewViewShell?.select?.(view))return;
   if(sub)window.NewViewWatch?.select?.(sub);
   active=id;
   document.body.dataset.simpleSection=id;
   for(const [key,button] of buttons){
    const selected=key===id;
    button.classList.toggle('active',selected);button.setAttribute('aria-current',selected?'page':'false');button.setAttribute('aria-pressed',String(selected));
    button.tabIndex=selected?0:-1;
   }
   const title=document.getElementById('workspace-title');if(title)title.textContent=label;
  }
  for(const [id,label] of sections){
   const button=el('button','nv-simple-tab',label);button.type='button';button.dataset.simpleView=id;
   button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>show(id));buttons.set(id,button);nav.append(button);
  }
  nav.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   const items=[...buttons.values()],index=items.indexOf(document.activeElement);
   if(index<0)return;
   const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowLeft'?-1:1)+items.length)%items.length;
   event.preventDefault();items[next].focus();show(sections[next][0]);
  });
  oldNav.after(nav);
  const devices=el('button','nv-simple-device','Devices');devices.type='button';devices.id='nv-simple-device';devices.title='Device pairing and casting';
  devices.addEventListener('click',()=>{window.NewViewShell?.select?.('devices');document.body.dataset.simpleSection='devices';for(const button of buttons.values()){button.classList.remove('active');button.setAttribute('aria-pressed','false');button.removeAttribute('aria-current');button.tabIndex=0;}});
  header.append(devices);
  const homeContent=el('section','nv-simple-home');homeContent.id='nv-simple-home';homeContent.setAttribute('aria-label','NewView Home');
  const banner=el('div','nv-simple-welcome');
  const eyebrow=el('span','nv-simple-eyebrow','HOME DASHBOARD');
  const title=el('h2','', 'Your world, one view');
  const intro=el('p','', 'Open what matters. Advanced tools stay in their own sections.');
  banner.append(eyebrow,title,intro);
  const grid=el('div','nv-simple-grid');
  const tiles=[
   ['Markets','Live market charts and watchlists','markets','chart'],
   ['Live TV','Browse IPTV channels','watch','tv'],
   ['Headlines','News and public feeds','news','news'],
   ['Casting','Connect your phone and TV','devices','cast']
  ];
  for(const [name,description,target,iconName] of tiles){
   const button=el('button','nv-simple-tile');button.type='button';button.dataset.simpleTarget=target;
   const icon=el('span','nv-simple-tile-icon');icon.setAttribute('aria-hidden','true');
   icon.textContent=iconName==='chart'?'▤':iconName==='tv'?'▣':iconName==='news'?'▥':'▧';
   const content=el('span','nv-simple-tile-text');
   const heading=el('strong','',name),sub=el('small','',description);
   content.append(heading,sub);button.append(icon,content);
   button.addEventListener('click',()=>target==='devices'?devices.click():show(target));
   grid.append(button);
  }
  const tools=el('div','nv-simple-home-bottom');
  const summary=el('p','', 'Choose a section above to view live data. A source is only considered working after a successful check.');
  const layout=el('button','nv-simple-layout','Customize layout');layout.type='button';
  layout.addEventListener('click',()=>{
   const customize=home.querySelector('.newview-personalize');
   if(customize){customize.open=true;customize.scrollIntoView({block:'start',behavior:'smooth'});}
  });
  tools.append(summary,layout);homeContent.append(banner,grid,tools);
  home.prepend(homeContent);
  const settings=document.getElementById('newview-settings');
  settings?.querySelector('summary')?.setAttribute('aria-label','Open advanced settings');
  // Deprecated promotional/business/social bookmark widgets are deliberately
  // excluded from the visible simplified experience but retained in the DOM
  // for older local profiles and existing controllers.
  document.querySelectorAll('.newview-powerbi-hero,.newview-powerbi-grid,.social-intro,.social-links,.newview-quicklinks').forEach(node=>node.hidden=true);
  // Selecting a workspace through the existing keyboard shortcuts or Android
  // native back button keeps the new navigation in sync.
  document.addEventListener('newview:workspace-change',event=>{
   const view=event.detail?.view;
   if(view==='devices'){document.body.dataset.simpleSection='devices';return;}
   if(view==='myview'&&active!=='home')active='home';
   if(view==='markets')active='markets';
   if(view==='media'&&!['watch','news'].includes(active))active='watch';
   const selected=view==='myview'?'home':view==='markets'?'markets':view==='media'?active:null;
   if(selected){
    document.body.dataset.simpleSection=selected;
    for(const [key,button] of buttons){const on=key===selected;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));if(on)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');button.tabIndex=on?0:-1;}
   }
  });
  // The simple shell always lands on Home on first load.
  show('home');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
