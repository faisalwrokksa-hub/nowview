'use strict';
/* Android TV launcher presentation. Existing launchers remain untouched. */
(function(){
 if(!window.NewViewApps||document.body.classList.contains('home-panel'))return;
 document.body.classList.add('tv-launcher');
 const home=document.querySelector('[data-workspace="myview"]');
 if(!home)return;
 const bar=document.createElement('div');bar.className='tv-home-top';
 const clock=document.createElement('div');clock.className='tv-home-clock';clock.setAttribute('aria-label','Riyadh time');
 const actions=document.createElement('nav');actions.className='tv-home-actions';actions.setAttribute('aria-label','TV Home actions');
 function action(name,handler){const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',handler);actions.append(b);return b;}
 const apps=document.querySelector('.home-apps'),grid=document.getElementById('home-installed-grid');
 const settings=action('Settings',()=>{document.body.classList.toggle('tv-home-settings');if(document.body.classList.contains('tv-home-settings'))document.getElementById('wallpaper-file')?.focus();});
 action('Markets',()=>document.querySelector('[data-view-button="markets"]')?.click());
 action('News',()=>{document.querySelector('[data-view-button="media"]')?.click();window.NewViewWatch?.select('headlines');});
 action('TV',()=>document.querySelector('[data-view-button="media"]')?.click());
 const all=action('All apps',()=>{document.body.classList.toggle('tv-all-apps');if(document.body.classList.contains('tv-all-apps')){document.getElementById('home-refresh-apps')?.click();grid?.querySelector('button')?.focus();}});
 bar.append(clock,actions);home.prepend(bar);
 const favorites=document.createElement('nav');favorites.className='tv-home-favorites';favorites.setAttribute('aria-label','Favourite TV apps');
 const caption=document.createElement('span');caption.textContent='Favourites';favorites.append(caption);
 const wanted=[{name:'MR7 TV',match:/mr7/i},{name:'NewPipe',match:/newpipe/i}];
 for(const item of wanted){
  const button=document.createElement('button');button.type='button';button.textContent=item.name;
  button.addEventListener('click',()=>{
   try{
    const installed=JSON.parse(window.NewViewApps.listLaunchableApps());
    const app=installed.find(x=>item.match.test(x.label+' '+x.packageName));
    if(app)window.NewViewApps.launchApp(app.packageName);
    else document.getElementById('home-app-status').textContent=item.name+' is not installed or not discoverable. Open All apps.';
   }catch{document.getElementById('home-app-status').textContent='Unable to launch '+item.name;}
  });favorites.append(button);
 }
 home.append(favorites);
 function tick(){const now=new Date();clock.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}).format(now)+' · Riyadh';}
 tick();const timer=setInterval(()=>{if(!document.hidden)tick();},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'&&e.key!=='Backspace')return;
  if(document.body.classList.contains('tv-all-apps')){document.body.classList.remove('tv-all-apps');all.focus();e.preventDefault();}
  else if(document.body.classList.contains('tv-home-settings')){document.body.classList.remove('tv-home-settings');settings.focus();e.preventDefault();}
 });
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
