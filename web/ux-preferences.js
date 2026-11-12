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
  exportButton.addEventListener('click',()=>{const data={version:1,display:state,homeShortcuts:[],shortcutCount:3};try{const raw=localStorage.getItem('newview.home.boxes.v2');const loaded=raw?JSON.parse(raw):[];const allowedShortcuts=['markets','iptv','youtube','news','devices'];if(Array.isArray(loaded))data.homeShortcuts=[...new Set(loaded.filter(x=>allowedShortcuts.includes(x)))].slice(0,4);const count=Number(localStorage.getItem('newview.home.box-count.v2'));if(Number.isInteger(count)&&count>=1&&count<=4)data.shortcutCount=count;}catch{}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='newview-preferences.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});panel.append(exportButton);
  const importLabel=document.createElement('label');importLabel.textContent='Restore preferences from JSON';
  const importFile=document.createElement('input');importFile.type='file';importFile.accept='.json,application/json';importFile.setAttribute('aria-label','Restore NewView preferences JSON');
  const importStatus=document.createElement('p');importStatus.setAttribute('role','status');importStatus.setAttribute('aria-live','polite');
  let importVersion=0;
  importFile.addEventListener('change',async()=>{
   const currentImport=++importVersion;
   const file=importFile.files?.[0];if(!file)return;
   if(file.size>16384){importStatus.textContent='Preference file exceeds 16 KB.';importFile.value='';return;}
   try{
    const raw=await file.text();
    if(currentImport!==importVersion)return;
    const data=JSON.parse(raw);
    if(!data||data.version!==1||!data.display||typeof data.display!=='object'||Array.isArray(data.display))throw Error('Unsupported preference format');
    const allowedShortcuts=['markets','iptv','youtube','news','devices'];
    if(!Array.isArray(data.homeShortcuts)||data.homeShortcuts.length>4||data.homeShortcuts.some(x=>!allowedShortcuts.includes(x)))throw Error('Invalid Home shortcuts');
    if(!Number.isInteger(data.shortcutCount)||data.shortcutCount<1||data.shortcutCount>4)throw Error('Invalid shortcut count');
    if(Object.keys(data.display).some(k=>!Object.hasOwn(defaults,k))||Object.entries(data.display).some(([k,v])=>!allowed[k]?.includes(v)))throw Error('Invalid display settings');
    const clean=normalize(data.display);
    // Home and display settings use separate legacy storage keys. Snapshot every
    // key and roll all changes back if any write fails (quota/private-mode).
    const changes=[
     ['newview.home.boxes.v2',JSON.stringify([...new Set(data.homeShortcuts)])],
     ['newview.home.box-count.v2',String(data.shortcutCount)],
     [KEY,JSON.stringify(clean)]
    ];
    const previous=changes.map(([k])=>[k,localStorage.getItem(k)]);
    try{for(const [k,v] of changes)localStorage.setItem(k,v);}
    catch{
     let failed=false;
     for(const [k,v] of previous.reverse()){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{failed=true;}}
     throw Error(failed?'Preference import failed and rollback was incomplete. Review saved shortcuts before retrying.':'Device storage rejected the import. Previous preferences were restored.');
    }
    state=clean;apply(state);
    root.dispatchEvent(new CustomEvent('newview:ux-preferences',{detail:{...state}}));
    density.value=state.density;motion.value=state.motion;focus.value=state.focus;
    importStatus.textContent='Preferences restored. Reload NewView to refresh Home shortcuts.';
   }catch(error){importStatus.textContent='Restore failed: '+(error instanceof Error?error.message:'Invalid JSON file');}
   importFile.value='';
  });
  importLabel.append(importFile);panel.append(importLabel,importStatus);
  // Customer policy links must be configured only after the operator approves
  // real public HTTPS pages. Never fill these slots with fictitious contact URLs.
  const legal=document.createElement('section');legal.className='nv-legal-links';
  const legalHeading=document.createElement('h3');legalHeading.textContent='Privacy & support';legal.append(legalHeading);
  const links=[
   ['newview-privacy-policy-url','Privacy policy'],
   ['newview-support-url','Customer support']
  ];
  let missing=0;
  for(const [metaName,caption] of links){
   const raw=document.querySelector('meta[name="'+metaName+'"]')?.content?.trim();
   let valid=null;
   try{
    if(raw){
     const url=new URL(raw);
     if(url.protocol==='https:'&&url.hostname.includes('.')&&!url.username&&!url.password&&!url.port&&!url.hash)valid=url.href;
    }
   }catch{}
   if(valid){
    const anchor=document.createElement('a');anchor.href=valid;anchor.textContent=caption;
    anchor.target='_blank';anchor.rel='noopener noreferrer';legal.append(anchor);
   }else missing++;
  }
  if(missing){
   const notice=document.createElement('p');
   notice.textContent='Public privacy policy and support destinations are pending owner approval. Commercial distribution is not yet authorized.';
   legal.append(notice);
  }
  panel.append(legal);
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
