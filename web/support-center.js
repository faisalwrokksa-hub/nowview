'use strict';
/*
 * NewView Support Center — local-only first-use guidance and diagnostics.
 * Never uploads logs, CSVs, bookmarks, pairing credentials or identifiers.
 * A manual version check contacts only the current application's /version.
 */
(function(root){
 const SIMPLE_KEYS=new Set(['symbol','alerts','alertCooldowns']);
 const REVISION=/^[0-9a-f]{40}$/i;
 const CHANNELS=new Set(['preview','pilot','production']);
 let revision=null,serverState='not-checked';

 function readChannel(){
  const raw=document.querySelector('meta[name="newview-release-channel"]')?.content?.trim();
  return CHANNELS.has(raw)?raw:'preview';
 }
 function environment(){
  return typeof location!=='undefined'&&location.protocol==='file:'?'android-local-bundle':'web';
 }
 function snapshot(now=new Date()){
  // Deliberately coarse. Never include URL/location.href (pairing link), device
  // identifiers, navigator.userAgent, storage keys/values, or private files.
  return {
   schemaVersion:1,
   app:'NewView',
   releaseChannel:readChannel(),
   sourceRevision:revision,
   environment:environment(),
   networkIndicator:navigator.onLine===false?'offline':'not-known-offline',
   serverRevisionCheck:serverState,
   generatedAt:now.toISOString(),
   disclosures:'No source availability, media rights, account identity or device compatibility is certified by this report.'
  };
 }
 function clearLocalOwnedData(storage){
  // Do not call storage.clear(): other applications may share this origin.
  // Clear NewView namespaced keys and only three known legacy app keys.
  const matches=[];
  for(let i=0;i<storage.length;i++){
   const key=storage.key(i);
   if(typeof key==='string'&&(key.startsWith('newview.')||SIMPLE_KEYS.has(key)))matches.push(key);
  }
  let removed=0,failed=0;
  for(const key of matches){
   try{storage.removeItem(key);removed++;}
   catch{failed++;}
  }
  return {removed,failed};
 }
 function addText(parent,tag,content){
  const element=document.createElement(tag);element.textContent=content;
  parent.append(element);return element;
 }
 function button(label,parent){
  const node=document.createElement('button');
  node.type='button';node.textContent=label;
  parent.append(node);return node;
 }
 function install(){
  if(document.getElementById('newview-support-center'))return;
  const settings=document.querySelector('#newview-settings .newview-settings-content');
  if(!settings||document.body.classList.contains('home-panel'))return;
  const center=document.createElement('section');
  center.id='newview-support-center';center.className='shell-card newview-support-center';
  center.setAttribute('aria-label','NewView getting started, support and local data controls');
  addText(center,'h3','Getting started & support');
  const channel=readChannel(),isPreview=channel!=='production';
  const badge=addText(center,'p',isPreview?'Preview/pilot build — commercial release not approved':'Production-channel build — availability and content rights depend on approved providers');
  badge.className='newview-release-status';
  addText(center,'p','NewView displays source-linked market/news information and optional user-selected media. Not a broker or a licensed broadcaster. Some streams and websites may be unavailable on this device.');
  const guide=document.createElement('details');guide.className='newview-help-guide';
  const summary=addText(guide,'summary','First-use guide and TV controls');
  summary.setAttribute('aria-label','Open NewView first-use guide');
  const steps=document.createElement('ol');
  for(const instruction of [
   'MyView: select workspaces and choose widgets. TV remote: arrows move focus, Select opens a control, Back returns.',
   'Markets: quotes and charts reflect available third-party data and may be delayed or unavailable; do not treat them as investment advice.',
   'Business: choose a CSV on your device for local analysis. Avoid pasting sensitive records into outside websites.',
   'Watch: select independently published media. A publisher may block playback or framing; use its approved external player when offered.',
   'Devices: share pairing links only with trusted devices. Revoke a room from Devices to invalidate existing links.',
   'Settings: save display preferences and use diagnostics below if a feature fails.'
  ])addText(steps,'li',instruction);
  guide.append(steps);center.append(guide);

  const diagnostic=document.createElement('div');diagnostic.className='newview-support-actions';
  addText(diagnostic,'h4','App version & local diagnostics');
  const status=addText(diagnostic,'p','Build revision not checked. Network status alone does not prove provider availability.');
  status.id='newview-support-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const check=button('Check app revision',diagnostic);
  check.id='newview-support-check-version';
  check.addEventListener('click',async()=>{
   if(check.disabled)return;
   if(environment()==='android-local-bundle'){
    serverState='local-bundle';status.textContent='Android local bundle. The web /version endpoint is not available; see installed APK version in device Settings.';return;
   }
   if(navigator.onLine===false){
    serverState='offline';status.textContent='Device reports offline; no version check was sent.';return;
   }
   check.disabled=true;check.setAttribute('aria-busy','true');
   status.textContent='Checking this dashboard server…';serverState='checking';
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch('/version',{method:'GET',cache:'no-store',credentials:'same-origin',
     signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('Server unavailable');
    const data=await response.json();
    if(data?.app!=='newview'||!REVISION.test(data?.revision||''))throw Error('Unknown build identity');
    revision=data.revision.toLowerCase();serverState='verified';
    status.textContent='Dashboard revision: '+revision.slice(0,12)+' (server-reported; source services not checked).';
   }catch(error){
    revision=null;
    serverState=error?.name==='AbortError'?'timeout':'unavailable';
    status.textContent=serverState==='timeout'?'Version check timed out. Retry.':'Dashboard revision could not be verified; no external sources were checked.';
   }finally{clearTimeout(timer);check.disabled=false;check.removeAttribute('aria-busy');}
  });
  const exportButton=button('Export privacy-safe support summary',diagnostic);
  exportButton.id='newview-support-export';
  exportButton.addEventListener('click',()=>{
   // Export never includes source lists, room IDs, bookmarks or file contents.
   if(typeof Blob==='undefined'||typeof URL.createObjectURL!=='function'){
    status.textContent='This browser cannot export a support summary.';return;
   }
   try{
    const file=new Blob([JSON.stringify(snapshot(),null,2)+'\n'],{type:'application/json'});
    const objectUrl=URL.createObjectURL(file);
    const a=document.createElement('a');
    a.href=objectUrl;a.download='newview-support-summary.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
    status.textContent='Local support summary exported. Nothing was sent to NewView or a third party.';
   }catch{status.textContent='Could not export support summary on this device.';}
  });
  addText(diagnostic,'p','Support summaries contain only app release mode, coarse connection state, and a verified server revision if you check it. No private CSV, pairing link, profile, bookmark, token, IP address, or device ID is included.');
  center.append(diagnostic);

  const privacy=document.createElement('div');privacy.className='newview-local-data';
  addText(privacy,'h4','Your data on this device');
  addText(privacy,'p','This control removes NewView-namespaced saved preferences, local bookmarks, wallpaper, display shortcuts and local alert settings from this browser/app WebView. It does not delete external publisher data, browser cookies, cloud logs, Android app files or remote pairing rooms.');
  addText(privacy,'p','Before clearing, use Devices → Revoke pairing if you need a shared room disabled for other devices.');
  const clear=button('Clear this device’s saved NewView data',privacy);
  clear.id='newview-clear-local-data';
  const clearStatus=addText(privacy,'p','No data removed.');clearStatus.id='newview-clear-local-status';
  clearStatus.setAttribute('role','status');clearStatus.setAttribute('aria-live','polite');
  clear.addEventListener('click',()=>{
   if(!root.confirm?.('Remove NewView preferences and saved content from THIS device? This cannot be undone. Cloud pairing rooms and server logs are not deleted. Revoke pairing from Devices separately.'))return;
   try{
    const {removed,failed}=clearLocalOwnedData(localStorage);
    if(failed){clearStatus.textContent='Removed '+removed+' local entries; '+failed+' could not be removed. Review device storage permissions.';return;}
    clearStatus.textContent='Removed '+removed+' local entries. Reload NewView to apply defaults. Shared pairing rooms remain active until revoked.';
    if(typeof location!=='undefined'&&typeof location.reload==='function'){
     // Drop any pairing secret from the address before reloading a clean state.
     try{if(location.hash?.startsWith('#sync='))history.replaceState(null,'',location.pathname+location.search);}catch{}
     location.reload();
    }
   }catch{clearStatus.textContent='Local storage is unavailable. No successful reset can be confirmed.';}
  });
  center.append(privacy);
  settings.append(center);
 }
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
 }
 root.NewViewSupport=Object.freeze({snapshot,clearLocalOwnedData,releaseChannel:readChannel});
})(typeof window!=='undefined'?window:globalThis);
