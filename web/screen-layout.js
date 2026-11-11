'use strict';
/* MyView 1/2/3 responsive summary panes; dock sizing persists locally.
   Layout only, never captures or transmits screens. */
(function(){
 const LAYOUT_KEY='newview.layout.panels.v1',SIZE_KEY='newview.layout.video-size.v1';
 const liveSummaries={myview:'Waiting for Source Monitor updates',markets:'Waiting for a current market quote',media:'Waiting for source-linked news'};
 const sizes=new Set(['third','half','full']);
 const get=(key,valid,defaultValue)=>{try{const value=localStorage.getItem(key);return valid(value)?value:defaultValue;}catch{return defaultValue;}};
 let count=Number(get(LAYOUT_KEY,v=>v==='1'||v==='2'||v==='3','1'));
 let size=get(SIZE_KEY,v=>sizes.has(v),'third');
 function applyPanels(){
  const container=document.querySelector('[data-workspace="myview"]');
  if(!container)return;
  container.dataset.screenCount=String(count);
  const grids=document.getElementById('newview-screen-panes');
  if(!grids)return;
  grids.replaceChildren();
  if(count===1){grids.hidden=true;return;}
  grids.hidden=false;
  const summaries=[
   {title:'MyView overview',text:'Pinned widgets, updates and Power BI shortcut',view:'myview'},
   {title:'Markets',text:'Open interactive market charts and watchlists',view:'markets'},
   {title:'Discover',text:'News, IPTV and YouTube viewing hub',view:'media'}
  ];
  for(const info of summaries.slice(0,count)){
   const card=document.createElement('section');card.className='newview-screen-pane';
   const title=document.createElement('h3');title.textContent=info.title;
   const description=document.createElement('p');description.textContent=info.text;
   const detail=document.createElement('p');detail.className='newview-pane-live';detail.dataset.liveView=info.view;detail.textContent=liveSummaries[info.view];
   const button=document.createElement('button');button.type='button';
   button.textContent='Open '+info.title;button.addEventListener('click',()=>root.NewViewShell?.select(info.view));
   card.append(title,description,detail,button);grids.append(card);
  }
 }
 function updateSummary(view,text){
  if(!Object.hasOwn(liveSummaries,view)||typeof text!=='string')return;
  liveSummaries[view]=text.slice(0,230);
  const panel=document.querySelector('[data-live-view="'+view+'"]');
  if(panel)panel.textContent=liveSummaries[view];
 }
 function setCount(value){
  if(!Number.isInteger(Number(value))||![1,2,3].includes(Number(value)))return false;
  count=Number(value);try{localStorage.setItem(LAYOUT_KEY,String(count));}catch{}
  applyPanels();updateButtons();return true;
 }
 function updateButtons(){
  document.querySelectorAll('[data-newview-panels]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.newviewPanels)===count)));
 }
 function setSize(value){
  if(!sizes.has(value))return false;
  size=value;try{localStorage.setItem(SIZE_KEY,value);}catch{}
  document.body.dataset.newviewVideoSize=value;
  document.querySelectorAll('[data-newview-size]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.newviewSize===value)));
  return true;
 }
 function install(){
  if(document.body.classList.contains('home-panel'))return;
  const home=document.querySelector('[data-workspace="myview"]');
  if(!home||document.getElementById('newview-screen-layout'))return;
  const header=document.createElement('section');header.id='newview-screen-layout';header.className='shell-card newview-screen-layout';
  const title=document.createElement('h3');title.textContent='MyView · Screen layouts';
  const description=document.createElement('p');description.textContent='Choose one, two or three dashboard panels. Video can be resized separately and stays available across workspaces.';
  const controls=document.createElement('div');controls.className='newview-screen-layout-actions';
  for(const n of [1,2,3]){
   const button=document.createElement('button');button.type='button';button.dataset.newviewPanels=String(n);button.textContent=n+' screen'+(n===1?'':'s');
   button.addEventListener('click',()=>setCount(n));controls.append(button);
  }
  const sizeTitle=document.createElement('p');sizeTitle.textContent='Floating video size';
  for(const entry of [{key:'third',name:'⅓ screen'},{key:'half',name:'½ screen'},{key:'full',name:'Full screen'}]){
   const button=document.createElement('button');button.type='button';button.dataset.newviewSize=entry.key;button.textContent=entry.name;
   button.addEventListener('click',()=>{setSize(entry.key);root.NewViewCast?.open?.();});controls.append(button);
  }
  const grids=document.createElement('div');grids.id='newview-screen-panes';grids.className='newview-screen-panes';
  header.append(title,description,controls,grids);home.prepend(header);
  root.addEventListener?.('newview:market',e=>{
   const quote=e.detail;
   if(!quote||quote.source!=='binance'||typeof quote.symbol!=='string'||!Number.isFinite(quote.price)||quote.price<0||!Number.isFinite(quote.quoteTime))return;
   const stale=Date.now()-quote.quoteTime*1000>120000||quote.quoteTime*1000>Date.now()+300000;
   updateSummary('markets',quote.symbol+' · '+new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(quote.price)+' '+(quote.currency==='USDT'?'USDT':'units')+(stale?' · stale quote':' · recent quote')+' · Binance source');
  });
  root.addEventListener?.('newview:news',e=>{
   const snapshot=e.detail;
   if(!snapshot||typeof snapshot.headline!=='string'||!snapshot.headline.trim())return;
   updateSummary('media',snapshot.headline.trim()+' · source '+String(snapshot.source||'unknown').slice(0,24));
  });
  root.addEventListener?.('newview:update',e=>{
   if(typeof e.detail?.message==='string')updateSummary('myview',e.detail.message);
  });
  setSize(size);applyPanels();updateButtons();
 }
 const root=typeof window!=='undefined'?window:globalThis;
 root.NewViewLayout=Object.freeze({setCount,setSize,getCount:()=>count,getSize:()=>size});
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
})();
