'use strict';
/* Shared NowView shell: six workspaces, with no fake financial/social data. */
(function(){
 const views=['myview','markets','business','news','media','social'];
 const names={myview:'MyView',markets:'NowViewMarkets',business:'NowViewBusiness',news:'NowViewNews',media:'NowViewMedia',social:'NowViewSocial'};
 const getStored=()=>{try{const v=localStorage.getItem('nowview.workspace');return views.includes(v)?v:'myview';}catch{return 'myview';}};
 function select(view){
  if(!views.includes(view)||document.body.classList.contains('home-panel'))return false;
  const market=document.getElementById('market-shell');
  const chart=document.querySelector('.workspace');
  const board=document.getElementById('stock-board');
  document.querySelectorAll('[data-workspace]').forEach(el=>{el.hidden=el.dataset.workspace!==view;});
  for(const el of document.querySelectorAll('[data-view-button]')){
   const active=el.dataset.viewButton===view;el.setAttribute('aria-pressed',String(active));el.classList.toggle('selected',active);
  }
  document.getElementById('workspace-title').textContent=names[view];
  document.body.dataset.currentWorkspace=view;
  if(view==='markets'){
    market.hidden=false;
    const isBoard=document.body.classList.contains('board-active');
    board.hidden=!isBoard;chart.hidden=isBoard;
    if(!isBoard)requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }else{market.hidden=true;board.hidden=true;chart.hidden=true;}
  try{localStorage.setItem('nowview.workspace',view);}catch{}
  return true;
 }
 function install(){
  if(document.body.classList.contains('home-panel'))return;
  const nav=document.getElementById('workspace-switcher');if(!nav)return;
  nav.addEventListener('click',event=>{const b=event.target.closest('[data-view-button]');if(b)select(b.dataset.viewButton);});
  document.querySelectorAll('[data-open-markets]').forEach(b=>b.addEventListener('click',()=>select('markets')));
  const boardButton=document.getElementById('board-toggle');
  if(boardButton)document.getElementById('shell-market-actions').appendChild(boardButton);
  select(getStored());
 }
 window.NowViewShell={views,names,select,getStored};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
