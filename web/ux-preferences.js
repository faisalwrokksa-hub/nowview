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
