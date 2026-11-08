'use strict';
/* MyView: local-only dashboard pinning. Widget IDs are strictly allowlisted. */
(function(){
 const catalog=Object.freeze([
  Object.freeze({id:'market',title:'Markets',description:'Open verified Binance market charts and watchlists.',view:'markets',label:'Market charts'}),
  Object.freeze({id:'news',title:'News',description:'Read source-linked financial announcements.',view:'news',label:'Financial announcements'}),
  Object.freeze({id:'media',title:'Media',description:'Open supported video and TV playback options.',view:'media',label:'Video and TV'}),
  Object.freeze({id:'business',title:'Business',description:'Import your authorized business CSV locally to review KPIs.',view:'business',label:'Business KPIs'}),
  Object.freeze({id:'social',title:'Social',description:'Save and open public social profile bookmarks.',view:'social',label:'Social discovery'})
 ]);
 const ids=new Set(catalog.map(x=>x.id));
 const defaults=['market','news','media'];
 const key='newview.myview.widgets.v1';
 function sanitize(input){
  if(!Array.isArray(input))return [...defaults];
  const out=[];for(const id of input){
   if(typeof id==='string'&&ids.has(id)&&!out.includes(id))out.push(id);
   if(out.length>=catalog.length)break;
  }return out;
 }
 function load(){try{const raw=localStorage.getItem(key);return raw===null?[...defaults]:sanitize(JSON.parse(raw));}catch{return [...defaults];}}
 function save(selected){const safe=sanitize(selected);try{localStorage.setItem(key,JSON.stringify(safe));}catch{}return safe;}
 const root=document.getElementById('myview-grid'),editor=document.getElementById('myview-editor'),summary=document.getElementById('myview-count');
 if(!root||!editor){window.NewViewPersonal={catalog,sanitize,load,save};return;}
 let chosen=load();
 const snapshots={market:null,business:null,news:null,social:null};
 const preview={
  market:v=>v&&Number.isFinite(v.price)?v.symbol+' · '+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v.price)+' '+(v.currency||'USDT')+' · quote '+new Date(v.quoteTime*1000).toLocaleTimeString():'No verified quote received',
  business:v=>v&&Number.isFinite(v.revenue)?'Revenue '+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v.revenue)+' · '+v.orders+' orders · '+v.asOf:'Upload a CSV in Business to view session KPIs',
  news:v=>v&&v.count?v.count+' '+(v.source==='fed'?'Federal Reserve':'SEC')+' announcements · '+(v.headline||''):'Load official announcements in News',
  social:v=>v?v.count+' locally saved public profiles':'No public profiles saved',
  media:()=> 'Open a video in Media; no playback is started here'
 };
 function text(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;return el;}
 function render(){
  root.replaceChildren();editor.replaceChildren();
  summary.textContent=chosen.length+' of '+catalog.length+' widgets selected · saved on this device';
  for(const widget of catalog){
   const row=document.createElement('label');row.className='myview-option';
   const input=document.createElement('input');input.type='checkbox';input.checked=chosen.includes(widget.id);
   input.setAttribute('aria-label','Show '+widget.title+' widget');
   input.addEventListener('change',()=>{chosen=save(input.checked?[...chosen,widget.id]:chosen.filter(x=>x!==widget.id));render();});
   row.append(input,text('span','',widget.title));editor.appendChild(row);
  }
  if(!chosen.length){root.append(text('p','myview-empty','No widgets selected. Choose a widget above to customize this dashboard.'));return;}
  for(const id of chosen){
   const widget=catalog.find(x=>x.id===id);
   const item=document.createElement('article');item.className='myview-widget';
   item.dataset.widget=id;
   const heading=text('h3','',widget.title);
   const eyebrow=text('div','shell-eyebrow',widget.label);
   const description=text('p','',widget.description);
   const insight=text('p','myview-insight',preview[id](snapshots[id]));
   insight.setAttribute('aria-label',widget.title+' source snapshot');
   const actions=document.createElement('div');actions.className='myview-widget-actions';
   const button=text('button','shell-primary','Open '+widget.title);
   button.type='button';button.setAttribute('aria-label','Open NewView'+widget.title);
   button.addEventListener('click',()=>window.NewViewShell?.select(widget.view));
   const up=text('button','','↑');up.type='button';up.title='Move '+widget.title+' earlier';up.setAttribute('aria-label','Move '+widget.title+' earlier');
   const down=text('button','','↓');down.type='button';down.title='Move '+widget.title+' later';down.setAttribute('aria-label','Move '+widget.title+' later');
   const index=chosen.indexOf(id);up.disabled=index===0;down.disabled=index===chosen.length-1;
   function move(delta){const next=[...chosen],at=next.indexOf(id);if(at+delta<0||at+delta>=next.length)return;[next[at],next[at+delta]]=[next[at+delta],next[at]];chosen=save(next);render();}
   up.addEventListener('click',()=>move(-1));down.addEventListener('click',()=>move(1));
   actions.append(button,up,down);item.append(eyebrow,heading,description,insight,actions);root.append(item);
  }
 }
 document.getElementById('myview-reset')?.addEventListener('click',()=>{chosen=save(defaults);render();});
 for(const id of ['market','business','news','social'])window.addEventListener('newview:'+id,event=>{
  snapshots[id]=event.detail&&typeof event.detail==='object'?event.detail:null;
  if(document.body.dataset.currentWorkspace==='myview')render();
 });
 window.NewViewPersonal={catalog,sanitize,load,save,render,preview};
 render();
})();
