'use strict';
/* Android TV launcher presentation. Existing launchers remain untouched. */
(function(){
 if(!window.NewViewApps||document.body.classList.contains('home-panel'))return;
 document.body.classList.add('tv-launcher');
 const home=document.querySelector('[data-workspace="myview"]');
 if(!home)return;
 const bar=document.createElement('div');bar.className='tv-home-top';
 const clock=document.createElement('div');clock.className='tv-home-clock';clock.setAttribute('aria-label','Local device time');
 const actions=document.createElement('nav');actions.className='tv-home-actions';actions.setAttribute('aria-label','TV Home actions');
 function action(name,handler){const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',handler);actions.append(b);return b;}
 const grid=document.getElementById('home-installed-grid');
 const status=document.getElementById('home-app-status');
 function report(message){if(status)status.textContent=message;}
 function restoreFocus(target){if(target?.isConnected&&!target.disabled){try{target.focus({preventScroll:true});}catch{target.focus();}}}
 const settings=action('Settings',()=>{document.body.classList.toggle('tv-home-settings');if(document.body.classList.contains('tv-home-settings'))document.getElementById('wallpaper-file')?.focus();});
 action('Markets',()=>document.querySelector('[data-view-button="markets"]')?.click());
 action('News',()=>{document.querySelector('[data-view-button="media"]')?.click();window.NewViewWatch?.select?.('headlines');});
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
    if(typeof window.NewViewApps.listLaunchableApps!=='function'){report('Installed-app discovery is not supported on this device.');return;}
    const response=window.NewViewApps.listLaunchableApps();
    const installed=typeof response==='string'?JSON.parse(response):response;
    if(!Array.isArray(installed)){report('Installed-app list is unavailable.');return;}
    const app=installed.find(x=>x&&item.match.test(String(x.label||'')+' '+String(x.packageName||'')));
    if(app&&typeof app.packageName==='string'&&app.packageName&&typeof window.NewViewApps.launchApp==='function')window.NewViewApps.launchApp(app.packageName);
    else report(item.name+' is not installed or not discoverable. Open All apps.');
   }catch{report('Unable to launch '+item.name);}
  });favorites.append(button);
 }
 home.append(favorites);
 function tick(){const now=new Date();try{clock.textContent=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}).format(now)+' · Local';}catch{clock.textContent=now.toLocaleString()+' · Local';}}
 tick();const timer=setInterval(()=>{if(!document.hidden)tick();},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.key!=='Escape'&&e.key!=='Backspace')return;
  if(e.key==='Backspace'&&e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  if(document.body.classList.contains('tv-all-apps')){document.body.classList.remove('tv-all-apps');restoreFocus(all);e.preventDefault();}
  else if(document.body.classList.contains('tv-home-settings')){document.body.classList.remove('tv-home-settings');restoreFocus(settings);e.preventDefault();}
 });
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
