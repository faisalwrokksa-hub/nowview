'use strict';
/* Shared, local-only navigation and accessibility preferences across NewView screens. */
(function(root){
 const KEY='newview.ux.preferences.v1';
 const defaults={density:'comfortable',motion:'system',focus:'visible'};
 const allowed={density:['comfortable','compact'],motion:['system','reduced'],focus:['visible','strong']};
 function normalize(input){
  const result={};
  for(const key of Object.keys(defaults))result[key]=allowed[key].includes(input?.[key])?input[key]:defaults[key];
  return result;
 }
 function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return {...defaults};}}
 function apply(state){
  const body=document.body;
  body.dataset.nvDensity=state.density;
  body.dataset.nvMotion=state.motion;
  body.dataset.nvFocus=state.focus;
 }
 let state=load();
 function save(next){
  state=normalize({...state,...next});apply(state);
  try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
  root.dispatchEvent(new CustomEvent('newview:ux-preferences',{detail:{...state}}));
 }
 function install(){
  if(document.getElementById('nv-ux-controls'))return;
  apply(state);
  const host=document.getElementById('newview-settings')||document.querySelector('[data-workspace="myview"]');
  if(!host)return;
  const panel=document.createElement('section');panel.id='nv-ux-controls';panel.className='shell-card nv-ux-controls';
  panel.setAttribute('aria-label','Display and navigation preferences');
  const heading=document.createElement('h3');heading.textContent='Display & navigation';panel.append(heading);
  const description=document.createElement('p');description.textContent='These preferences stay on this device. They do not change account settings.';panel.append(description);
  function field(labelText,key,options){
   const label=document.createElement('label');label.textContent=labelText;
   const select=document.createElement('select');select.setAttribute('aria-label',labelText);
   for(const [value,title] of options){const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);}
   select.value=state[key];select.addEventListener('change',()=>save({[key]:select.value}));
   label.append(select);panel.append(label);return select;
  }
  const density=field('Layout spacing','density',[['comfortable','Comfortable'],['compact','Compact']]);
  const motion=field('Motion','motion',[['system','Follow device'],['reduced','Reduce animation']]);
  const focus=field('Focus indicator','focus',[['visible','Standard'],['strong','High visibility']]);
  const reset=document.createElement('button');reset.type='button';reset.textContent='Reset display preferences';
  reset.addEventListener('click',()=>{save(defaults);density.value=state.density;motion.value=state.motion;focus.value=state.focus;});panel.append(reset);
  const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='Export preferences';
  exportButton.addEventListener('click',()=>{const data={version:1,display:state};try{const raw=localStorage.getItem('newview.home.boxes.v2');data.homeShortcuts=raw?JSON.parse(raw):[];data.shortcutCount=Number(localStorage.getItem('newview.home.box-count.v2'))||3;}catch{data.homeShortcuts=[];}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='newview-preferences.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});panel.append(exportButton);
  const importLabel=document.createElement('label');importLabel.textContent='Restore preferences from JSON';
  const importFile=document.createElement('input');importFile.type='file';importFile.accept='.json,application/json';importFile.setAttribute('aria-label','Restore NewView preferences JSON');
  const importStatus=document.createElement('p');importStatus.setAttribute('role','status');importStatus.setAttribute('aria-live','polite');
  importFile.addEventListener('change',async()=>{
   const file=importFile.files?.[0];if(!file)return;
   if(file.size>16384){importStatus.textContent='Preference file exceeds 16 KB.';importFile.value='';return;}
   try{
    const data=JSON.parse(await file.text());
    if(!data||data.version!==1||!data.display||typeof data.display!=='object'||Array.isArray(data.display))throw Error('Unsupported preference format');
    const allowedShortcuts=['markets','iptv','youtube','news','devices'];
    if(!Array.isArray(data.homeShortcuts)||data.homeShortcuts.length>4||data.homeShortcuts.some(x=>!allowedShortcuts.includes(x)))throw Error('Invalid Home shortcuts');
    if(!Number.isInteger(data.shortcutCount)||data.shortcutCount<1||data.shortcutCount>4)throw Error('Invalid shortcut count');
    if(Object.keys(data.display).some(k=>!Object.hasOwn(defaults,k))||Object.entries(data.display).some(([k,v])=>!allowed[k]?.includes(v)))throw Error('Invalid display settings');
    const clean=normalize(data.display);
    localStorage.setItem('newview.home.boxes.v2',JSON.stringify([...new Set(data.homeShortcuts)]));
    localStorage.setItem('newview.home.box-count.v2',String(data.shortcutCount));
    save(clean);density.value=state.density;motion.value=state.motion;focus.value=state.focus;
    importStatus.textContent='Preferences restored. Reload NewView to refresh Home shortcuts.';
   }catch(error){importStatus.textContent='Restore failed: '+(error instanceof Error?error.message:'Invalid JSON file');}
   importFile.value='';
  });
  importLabel.append(importFile);panel.append(importLabel,importStatus);
  host.append(panel);
  // Preserve focus when a workspace switch removes or hides the focused control.
  const nav=document.getElementById('nv-simple-nav')||document.getElementById('workspace-switcher');
  if(nav){
   nav.addEventListener('click',event=>{
    const control=event.target.closest('button,[role="tab"]');
    if(!control||!nav.contains(control))return;
    const id=control.getAttribute('data-view-button')||control.getAttribute('data-section')||control.textContent.trim().toLowerCase();
    try{sessionStorage.setItem('newview.ux.last-navigation.v1',id.slice(0,64));}catch{}
   });
  }
  const network=document.createElement('p');network.className='nv-ux-network';network.setAttribute('role','status');
  network.setAttribute('aria-live','polite');
  function updateNetwork(){network.textContent=navigator.onLine?'Network: connected (source availability may vary)':'Network: offline — saved settings remain available';}
  updateNetwork();root.addEventListener('online',updateNetwork);root.addEventListener('offline',updateNetwork);panel.append(network);
 }
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
 root.NewViewUX=Object.freeze({get:()=>({...state}),set:save});
})(typeof window!=='undefined'?window:globalThis);
